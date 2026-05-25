import axios from "axios";
import prisma from "../lib/prisma.js";
import { decrypt, encrypt } from "../lib/encryption.js";
import { enqueuePostMetricsSync } from "../workers/analyticsWorker.js";

const FB = "https://graph.facebook.com/v19.0";

function fbPermalink(externalId, pageId) {
  if (!externalId) return null;
  if (externalId.includes("_")) {
    const idx = externalId.indexOf("_");
    const pid = externalId.slice(0, idx);
    const postId = externalId.slice(idx + 1);
    return `https://www.facebook.com/${pid}/posts/${postId}`;
  }
  return `https://www.facebook.com/photo/?fbid=${externalId}`;
}

async function igWaitForContainer(containerId, token, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await axios.get(`${FB}/${containerId}`, {
      params: { fields: "status_code,status", access_token: token },
    });
    const { status_code, status } = res.data;
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`Instagram container failed with status: ${status_code}${status ? ` — ${status}` : ""}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Instagram container timed out waiting to be ready.");
}

async function igPermalink(mediaId, token) {
  try {
    const res = await axios.get(`${FB}/${mediaId}`, {
      params: { fields: "permalink", access_token: token },
    });
    return res.data.permalink ?? null;
  } catch {
    return null;
  }
}

function mediaUrl(assetUrl) {
  const base = process.env.API_URL || "http://localhost:3001";
  return assetUrl.startsWith("http") ? assetUrl : `${base}${assetUrl}`;
}

// Pick the best URL: variant for this platform/format → original → url
function getBestUrl(asset, platform, format) {
  const variant = asset.variants?.find(
    (v) => v.platform === platform && v.format === format
  );
  return mediaUrl(variant?.url ?? asset.originalUrl ?? asset.url);
}

// ── Facebook ──────────────────────────────────────────────────────────────────

async function publishFacebook(post, account) {
  const token = decrypt(account.accessToken);
  const pageId = account.accountId;
  const caption = post.captions?.facebook || Object.values(post.captions ?? {})[0] || "";
  const format = post.formats?.facebook ?? "feed_post";
  const images = (post.mediaAssets ?? []).filter((a) => a.type === "IMAGE");
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");

  // ── Story ──
  if (format === "story") {
    if (images.length > 0) {
      const res = await axios.post(`${FB}/${pageId}/photo_stories`, null, {
        params: { url: getBestUrl(images[0], "facebook", "story"), access_token: token },
      });
      return { externalId: res.data.post_id ?? res.data.id };
    }
    if (videos.length > 0) {
      // Facebook video story: first upload the video, then post as story
      const uploadRes = await axios.post(`${FB}/${pageId}/videos`, null, {
        params: {
          file_url: getBestUrl(videos[0], "facebook", "story"),
          published: false,
          access_token: token,
        },
      });
      const videoId = uploadRes.data.id;
      const storyRes = await axios.post(`${FB}/${pageId}/video_stories`, null, {
        params: { video_id: videoId, access_token: token },
      });
      return { externalId: storyRes.data.post_id ?? storyRes.data.id };
    }
    throw new Error("Facebook Story requires a photo or video.");
  }

  // ── Reel ──
  if (format === "reel") {
    if (videos.length === 0) throw new Error("Facebook Reel requires a video.");
    const videoUrl = getBestUrl(videos[0], "facebook", "reel");
    // Reels: multi-step upload
    const initRes = await axios.post(`${FB}/${pageId}/video_reels`, null, {
      params: { upload_phase: "start", access_token: token },
    });
    const videoId = initRes.data.video_id;
    await axios.post(`${FB}/${videoId}`, null, {
      params: {
        upload_phase: "finish",
        video_file_chunk: videoUrl,
        access_token: token,
      },
    });
    const publishRes = await axios.post(`${FB}/${pageId}/video_reels`, null, {
      params: {
        video_id: videoId,
        upload_phase: "finish",
        description: caption,
        access_token: token,
      },
    });
    return { externalId: publishRes.data.id ?? videoId };
  }

  // ── Feed Post (default) ──
  if (videos.length > 0) {
    const res = await axios.post(`${FB}/${pageId}/videos`, null, {
      params: {
        file_url: getBestUrl(videos[0], "facebook", format),
        description: caption,
        access_token: token,
      },
    });
    return { externalId: res.data.id, permalink: fbPermalink(res.data.id, pageId) };
  }
  if (images.length === 0) {
    const res = await axios.post(`${FB}/${pageId}/feed`, null, {
      params: { message: caption, access_token: token },
    });
    return { externalId: res.data.id, permalink: fbPermalink(res.data.id, pageId) };
  }
  if (images.length === 1) {
    const res = await axios.post(`${FB}/${pageId}/photos`, null, {
      params: { url: getBestUrl(images[0], "facebook", format), caption, access_token: token },
    });
    // post_id is the feed post ID needed for insights; fall back to photo id
    const externalId = res.data.post_id ?? res.data.id;
    return { externalId, permalink: fbPermalink(externalId, pageId) };
  }
  const photoIds = await Promise.all(
    images.map(async (img) => {
      const r = await axios.post(`${FB}/${pageId}/photos`, null, {
        params: { url: getBestUrl(img, "facebook", format), published: false, access_token: token },
      });
      return r.data.id;
    })
  );
  const res = await axios.post(`${FB}/${pageId}/feed`, null, {
    params: {
      message: caption,
      attached_media: JSON.stringify(photoIds.map((id) => ({ media_fbid: id }))),
      access_token: token,
    },
  });
  return { externalId: res.data.id, permalink: fbPermalink(res.data.id, pageId) };
}

// ── Instagram ─────────────────────────────────────────────────────────────────

async function publishInstagram(post, account) {
  const token = decrypt(account.accessToken);
  const igId = account.accountId;
  const caption = post.captions?.instagram || post.captions?.facebook || Object.values(post.captions ?? {})[0] || "";
  const format = post.formats?.instagram ?? "feed_post";
  const images = (post.mediaAssets ?? []).filter((a) => a.type === "IMAGE");
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");

  // ── Story ──
  if (format === "story") {
    let containerId;
    if (images.length > 0) {
      const res = await axios.post(`${FB}/${igId}/media`, null, {
        params: {
          image_url: getBestUrl(images[0], "instagram", "story"),
          media_type: "STORIES",
          access_token: token,
        },
      });
      containerId = res.data.id;
    } else if (videos.length > 0) {
      const res = await axios.post(`${FB}/${igId}/media`, null, {
        params: {
          video_url: getBestUrl(videos[0], "instagram", "story"),
          media_type: "STORIES",
          access_token: token,
        },
      });
      containerId = res.data.id;
    } else {
      throw new Error("Instagram Story requires a photo or video.");
    }
    await igWaitForContainer(containerId, token);
    const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
      params: { creation_id: containerId, access_token: token },
    });
    return { externalId: publishRes.data.id };
  }

  // ── Reel ──
  if (format === "reel") {
    if (videos.length === 0) throw new Error("Instagram Reel requires a video.");
    const res = await axios.post(`${FB}/${igId}/media`, null, {
      params: {
        video_url: getBestUrl(videos[0], "instagram", "reel"),
        media_type: "REELS",
        caption,
        access_token: token,
      },
    });
    await igWaitForContainer(res.data.id, token);
    const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
      params: { creation_id: res.data.id, access_token: token },
    });
    const mediaId = publishRes.data.id;
    return { externalId: mediaId, permalink: await igPermalink(mediaId, token) };
  }

  // ── Carousel ──
  if (format === "carousel") {
    if (images.length < 2) throw new Error("Instagram Carousel requires at least 2 images.");
    const itemIds = await Promise.all(
      images.map(async (img) => {
        const r = await axios.post(`${FB}/${igId}/media`, null, {
          params: {
            image_url: getBestUrl(img, "instagram", "carousel"),
            is_carousel_item: true,
            access_token: token,
          },
        });
        await igWaitForContainer(r.data.id, token);
        return r.data.id;
      })
    );
    const carRes = await axios.post(`${FB}/${igId}/media`, null, {
      params: {
        media_type: "CAROUSEL",
        children: itemIds.join(","),
        caption,
        access_token: token,
      },
    });
    await igWaitForContainer(carRes.data.id, token);
    const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
      params: { creation_id: carRes.data.id, access_token: token },
    });
    const mediaId = publishRes.data.id;
    return { externalId: mediaId, permalink: await igPermalink(mediaId, token) };
  }

  // ── Feed Post (default) ──
  if (images.length === 0) {
    throw new Error("Instagram requires at least one image. Text-only posts are not supported.");
  }
  if (images.length === 1) {
    const res = await axios.post(`${FB}/${igId}/media`, null, {
      params: { image_url: getBestUrl(images[0], "instagram", "feed_post"), caption, access_token: token },
    });
    await igWaitForContainer(res.data.id, token);
    const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
      params: { creation_id: res.data.id, access_token: token },
    });
    const mediaId = publishRes.data.id;
    return { externalId: mediaId, permalink: await igPermalink(mediaId, token) };
  }
  // Multi-image carousel (auto)
  const itemIds = await Promise.all(
    images.map(async (img) => {
      const r = await axios.post(`${FB}/${igId}/media`, null, {
        params: { image_url: getBestUrl(img, "instagram", "feed_post"), is_carousel_item: true, access_token: token },
      });
      await igWaitForContainer(r.data.id, token);
      return r.data.id;
    })
  );
  const carRes = await axios.post(`${FB}/${igId}/media`, null, {
    params: { media_type: "CAROUSEL", children: itemIds.join(","), caption, access_token: token },
  });
  await igWaitForContainer(carRes.data.id, token);
  const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
    params: { creation_id: carRes.data.id, access_token: token },
  });
  const mediaId = publishRes.data.id;
  return { externalId: mediaId, permalink: await igPermalink(mediaId, token) };
}

// ── Google token refresh ──────────────────────────────────────────────────────

async function getValidGoogleToken(account) {
  if (account.expiresAt && account.expiresAt > new Date(Date.now() + 60_000)) {
    return decrypt(account.accessToken);
  }
  if (!account.refreshToken) throw new Error("No Google refresh token — please reconnect YouTube.");
  const res = await axios.post("https://oauth2.googleapis.com/token", {
    refresh_token: decrypt(account.refreshToken),
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const { access_token, expires_in } = res.data;
  await prisma.platformAccount.update({
    where: { id: account.id },
    data: { accessToken: encrypt(access_token), expiresAt: new Date(Date.now() + expires_in * 1000) },
  });
  return access_token;
}

// ── YouTube ───────────────────────────────────────────────────────────────────

async function publishYouTube(post, account) {
  const token = await getValidGoogleToken(account);
  const format = post.formats?.youtube ?? "standard";
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");
  if (videos.length === 0) throw new Error("YouTube requires a video file.");

  const video = videos[0];
  const ytMeta = post.meta?.youtube ?? {};

  // Use YouTube-specific meta fields if available
  const title = (ytMeta.title || post.title || post.captions?.youtube || Object.values(post.captions ?? {})[0] || "Church Video").slice(0, 100);
  const description = (post.captions?.youtube || "").slice(0, 5000);
  const categoryId = ytMeta.category ?? "29";
  const privacyStatus = ytMeta.visibility ?? "public";
  const tags = ytMeta.tags ?? [];

  const videoUrl = getBestUrl(video, "youtube", format);
  const headRes = await axios.head(videoUrl);
  const fileSize = parseInt(headRes.headers["content-length"], 10);

  const initRes = await axios.post(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      snippet: { title, description, categoryId, tags },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
        ...(ytMeta.premiere && post.scheduledAt && {
          publishAt: new Date(post.scheduledAt).toISOString(),
          privacyStatus: "private",
        }),
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": fileSize,
      },
    }
  );

  const uploadUrl = initRes.headers.location;
  const fileStream = await axios.get(videoUrl, { responseType: "stream" });
  const uploadRes = await axios.put(uploadUrl, fileStream.data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "video/mp4",
      "Content-Length": fileSize,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const videoId = uploadRes.data.id;
  return { externalId: videoId, permalink: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null };
}

// ── TikTok token refresh ──────────────────────────────────────────────────────

async function getValidTikTokToken(account) {
  if (account.expiresAt && account.expiresAt > new Date(Date.now() + 60_000)) {
    return decrypt(account.accessToken);
  }
  if (!account.refreshToken) throw new Error("No TikTok refresh token — please reconnect TikTok.");
  const res = await axios.post(
    "https://open.tiktokapis.com/v2/oauth/token/",
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: decrypt(account.refreshToken),
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const { access_token, refresh_token, expires_in } = res.data;
  await prisma.platformAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(access_token),
      refreshToken: encrypt(refresh_token),
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
  return access_token;
}

// ── TikTok ────────────────────────────────────────────────────────────────────

async function publishTikTok(post, account) {
  const token = await getValidTikTokToken(account);
  const format = post.formats?.tiktok ?? "standard";
  const title = (post.captions?.tiktok || post.captions?.facebook || Object.values(post.captions ?? {})[0] || "").slice(0, 2200);
  const ttMeta = post.meta?.tiktok ?? {};

  // ── Photo Mode ──
  if (format === "photo_mode") {
    const images = (post.mediaAssets ?? []).filter((a) => a.type === "IMAGE");
    if (images.length < 2) throw new Error("TikTok Photo Mode requires at least 2 images.");
    const res = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/content/init/",
      {
        post_info: {
          title,
          privacy_level: ttMeta.privacy ?? "PUBLIC_TO_EVERYONE",
          disable_duet: ttMeta.disableDuet ?? false,
          disable_comment: false,
          disable_stitch: ttMeta.disableStitch ?? false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: images.map((img) => getBestUrl(img, "tiktok", "photo_mode")),
          photo_cover_index: 0,
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" } }
    );
    if (res.data?.error?.code && res.data.error.code !== "ok") {
      throw new Error(res.data.error.message || "TikTok photo publish failed");
    }
    return { externalId: res.data.data.publish_id };
  }

  // ── Standard Video ──
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");
  if (videos.length === 0) throw new Error("TikTok requires a video file.");
  const videoUrl = getBestUrl(videos[0], "tiktok", "standard");

  const res = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      post_info: {
        title,
        privacy_level: ttMeta.privacy ?? "PUBLIC_TO_EVERYONE",
        disable_duet: ttMeta.disableDuet ?? false,
        disable_comment: false,
        disable_stitch: ttMeta.disableStitch ?? false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" } }
  );
  if (res.data?.error?.code && res.data.error.code !== "ok") {
    throw new Error(res.data.error.message || "TikTok publish failed");
  }
  return { externalId: res.data.data.publish_id };
}

// ── Main publish function ─────────────────────────────────────────────────────

export async function publishPost(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { mediaAssets: { include: { variants: true } } },
  });

  if (!post) throw new Error(`Post ${postId} not found`);
  if (post.status === "PUBLISHED") return { skipped: true };

  const accounts = await prisma.platformAccount.findMany({
    where: { organizationId: post.organizationId, platform: { in: post.platforms } },
  });

  const platformResults = [];
  let successCount = 0;
  let failCount = 0;

  for (const platform of post.platforms) {
    const account = accounts.find((a) => a.platform === platform);

    if (!account) {
      platformResults.push({ platform, status: "failed", error: `No connected ${platform} account` });
      failCount++;
      continue;
    }

    try {
      let result;
      if (platform === "facebook") result = await publishFacebook(post, account);
      else if (platform === "instagram") result = await publishInstagram(post, account);
      else if (platform === "youtube") result = await publishYouTube(post, account);
      else if (platform === "tiktok") result = await publishTikTok(post, account);
      else throw new Error(`Publisher not implemented for ${platform}`);

      platformResults.push({ platform, status: "published", externalId: result.externalId, permalink: result.permalink ?? null, publishedAt: new Date() });
      successCount++;
    } catch (err) {
      const error = err?.response?.data?.error?.message || err.message;
      console.error(`[Publisher] ${platform} failed for post ${postId}:`, error);
      platformResults.push({ platform, status: "failed", error });
      failCount++;
    }
  }

  const postStatus =
    successCount > 0 && failCount > 0 ? "PARTIAL"
    : successCount > 0 ? "PUBLISHED"
    : "FAILED";

  await prisma.$transaction([
    prisma.platformResult.deleteMany({ where: { postId } }),
    ...platformResults.map((r) =>
      prisma.platformResult.create({
        data: {
          postId,
          platform: r.platform,
          status: r.status,
          externalId: r.externalId ?? null,
          permalink: r.permalink ?? null,
          error: r.error ?? null,
          publishedAt: r.publishedAt ?? null,
        },
      })
    ),
    prisma.post.update({
      where: { id: postId },
      data: {
        status: postStatus,
        publishedAt: successCount > 0 ? new Date() : null,
        failedAt: postStatus === "FAILED" ? new Date() : null,
        failureReason: postStatus === "FAILED" ? platformResults.map((r) => r.error).join("; ") : null,
      },
    }),
  ]);

  console.log(`[Publisher] Post ${postId} → ${postStatus} (${successCount} ok, ${failCount} failed)`);

  // Kick off analytics fetch 1 hour after publish so stats have time to populate
  if (successCount > 0) {
    enqueuePostMetricsSync(postId, 60 * 60 * 1000).catch(() => {});
  }

  return { postStatus, platformResults };
}
