import axios from "axios";
import prisma from "../lib/prisma.js";
import { decrypt, encrypt } from "../lib/encryption.js";

const FB = "https://graph.facebook.com/v19.0";

function mediaUrl(assetUrl) {
  const base = process.env.API_URL || "http://localhost:3001";
  return assetUrl.startsWith("http") ? assetUrl : `${base}${assetUrl}`;
}

// ── Platform publishers ───────────────────────────────────────────────────────

async function publishFacebook(post, account) {
  const token = decrypt(account.accessToken);
  const pageId = account.accountId;
  const caption = post.captions?.facebook || Object.values(post.captions ?? {})[0] || "";
  const images = (post.mediaAssets ?? []).filter((a) => a.type === "IMAGE");
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");

  if (videos.length > 0) {
    // Video post
    const res = await axios.post(`${FB}/${pageId}/videos`, null, {
      params: { file_url: mediaUrl(videos[0].url), description: caption, access_token: token },
    });
    return { externalId: res.data.id };
  }

  if (images.length === 0) {
    // Text-only post
    const res = await axios.post(`${FB}/${pageId}/feed`, null, {
      params: { message: caption, access_token: token },
    });
    return { externalId: res.data.id };
  }

  if (images.length === 1) {
    // Single photo post
    const res = await axios.post(`${FB}/${pageId}/photos`, null, {
      params: { url: mediaUrl(images[0].url), caption, access_token: token },
    });
    return { externalId: res.data.id };
  }

  // Multi-photo post: upload each as unpublished, then combine in feed
  const photoIds = await Promise.all(
    images.map(async (img) => {
      const r = await axios.post(`${FB}/${pageId}/photos`, null, {
        params: { url: mediaUrl(img.url), published: false, access_token: token },
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
  return { externalId: res.data.id };
}

async function publishInstagram(post, account) {
  const token = decrypt(account.accessToken);
  const igId = account.accountId;
  const caption = post.captions?.instagram || post.captions?.facebook || Object.values(post.captions ?? {})[0] || "";
  const images = (post.mediaAssets ?? []).filter((a) => a.type === "IMAGE");

  if (images.length === 0) {
    throw new Error("Instagram requires at least one image. Text-only posts are not supported.");
  }

  let containerId;

  if (images.length === 1) {
    const res = await axios.post(`${FB}/${igId}/media`, null, {
      params: { image_url: mediaUrl(images[0].url), caption, access_token: token },
    });
    containerId = res.data.id;
  } else {
    // Carousel
    const itemIds = await Promise.all(
      images.map(async (img) => {
        const r = await axios.post(`${FB}/${igId}/media`, null, {
          params: { image_url: mediaUrl(img.url), is_carousel_item: true, access_token: token },
        });
        return r.data.id;
      })
    );
    const res = await axios.post(`${FB}/${igId}/media`, null, {
      params: {
        media_type: "CAROUSEL",
        children: itemIds.join(","),
        caption,
        access_token: token,
      },
    });
    containerId = res.data.id;
  }

  const publishRes = await axios.post(`${FB}/${igId}/media_publish`, null, {
    params: { creation_id: containerId, access_token: token },
  });
  return { externalId: publishRes.data.id };
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

// ── YouTube publisher ─────────────────────────────────────────────────────────

async function publishYouTube(post, account) {
  const token = await getValidGoogleToken(account);
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");

  if (videos.length === 0) throw new Error("YouTube requires a video file.");

  const video = videos[0];
  const title = (post.title || post.captions?.youtube || Object.values(post.captions ?? {})[0] || "Church Video").slice(0, 100);
  const description = (post.captions?.youtube || post.captions?.facebook || Object.values(post.captions ?? {})[0] || "").slice(0, 5000);

  // Get file size via HEAD request to R2
  const videoUrl = mediaUrl(video.url);
  const headRes = await axios.head(videoUrl);
  const fileSize = parseInt(headRes.headers["content-length"], 10);

  // Step 1: Initiate resumable upload
  const initRes = await axios.post(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      snippet: { title, description, categoryId: "29" }, // 29 = Nonprofits & Activism
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
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

  // Step 2: Stream file from R2 to YouTube
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

  return { externalId: uploadRes.data.id };
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

// ── TikTok publisher ──────────────────────────────────────────────────────────

async function publishTikTok(post, account) {
  const token = await getValidTikTokToken(account);
  const videos = (post.mediaAssets ?? []).filter((a) => a.type === "VIDEO");

  if (videos.length === 0) throw new Error("TikTok requires a video file.");

  const title = (post.captions?.tiktok || post.captions?.facebook || Object.values(post.captions ?? {})[0] || "").slice(0, 2200);
  const videoUrl = mediaUrl(videos[0].url);

  const res = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      post_info: {
        title,
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
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
    include: { mediaAssets: true },
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

      platformResults.push({ platform, status: "published", externalId: result.externalId, publishedAt: new Date() });
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
    // Clear any previous results then write fresh ones
    prisma.platformResult.deleteMany({ where: { postId } }),
    ...platformResults.map((r) =>
      prisma.platformResult.create({
        data: {
          postId,
          platform: r.platform,
          status: r.status,
          externalId: r.externalId ?? null,
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
  return { postStatus, platformResults };
}
