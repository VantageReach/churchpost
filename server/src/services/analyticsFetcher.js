import axios from "axios";
import prisma from "../lib/prisma.js";
import { decrypt } from "../lib/encryption.js";

// ── Facebook / Instagram (Meta Graph API) ─────────────────────────────────────

async function fetchFacebookPostMetrics(postId, externalId, accessToken) {
  const fields = [
    "impressions",
    "reach",
    "post_reactions_by_type_total",
    "post_activity_by_action_type",
    "post_clicks",
    "post_video_views",
    "post_video_avg_time_watched",
  ].join(",");

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${externalId}/insights`,
      {
        params: { metric: fields, access_token: accessToken },
      }
    );

    const byName = {};
    for (const item of data?.data ?? []) {
      byName[item.name] = item.values?.[0]?.value ?? item.value ?? null;
    }

    const reactions = byName["post_reactions_by_type_total"] ?? {};
    const likes = Object.values(reactions).reduce((s, v) => s + (v || 0), 0);

    const activity = byName["post_activity_by_action_type"] ?? {};
    const comments = activity.comment ?? null;
    const shares = activity.share ?? null;

    const impressions = byName["post_impressions"] ?? byName["impressions"] ?? null;
    const reach = byName["post_impressions_unique"] ?? byName["reach"] ?? null;
    const clicks = byName["post_clicks"] ?? null;
    const videoViews = byName["post_video_views"] ?? null;
    const videoWatchTime =
      byName["post_video_avg_time_watched"] != null
        ? byName["post_video_avg_time_watched"] / 1000
        : null;

    const engTotal = (likes || 0) + (comments || 0) + (shares || 0);
    const engagementRate =
      reach && reach > 0 ? parseFloat(((engTotal / reach) * 100).toFixed(2)) : null;

    return {
      impressions,
      reach,
      likes: likes || null,
      comments,
      shares,
      saves: null,
      clicks,
      videoViews,
      videoWatchTime,
      engagementRate,
    };
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    console.warn(`[analytics] FB post metrics failed for ${externalId}: ${msg}`);
    return null;
  }
}

async function fetchInstagramPostMetrics(externalId, accessToken) {
  const fields = "like_count,comments_count,saved,reach,impressions,plays,shares";
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${externalId}`,
      { params: { fields, access_token: accessToken } }
    );

    const likes = data.like_count ?? null;
    const comments = data.comments_count ?? null;
    const saves = data.saved ?? null;
    const reach = data.reach ?? null;
    const impressions = data.impressions ?? null;
    const videoViews = data.plays ?? null;
    const shares = data.shares ?? null;

    const engTotal = (likes || 0) + (comments || 0) + (saves || 0);
    const engagementRate =
      reach && reach > 0 ? parseFloat(((engTotal / reach) * 100).toFixed(2)) : null;

    return {
      impressions,
      reach,
      likes,
      comments,
      shares,
      saves,
      clicks: null,
      videoViews,
      videoWatchTime: null,
      engagementRate,
    };
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message;
    console.warn(`[analytics] IG post metrics failed for ${externalId}: ${msg}`);
    return null;
  }
}

async function fetchFacebookAccountMetrics(pageId, accessToken) {
  try {
    const [fanRes, insightRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v21.0/${pageId}`, {
        params: { fields: "fan_count,followers_count", access_token: accessToken },
      }),
      axios.get(`https://graph.facebook.com/v21.0/${pageId}/insights`, {
        params: {
          metric: "page_impressions,page_reach",
          period: "days_28",
          access_token: accessToken,
        },
      }),
    ]);

    const followers = fanRes.data?.followers_count ?? fanRes.data?.fan_count ?? null;
    const byName = {};
    for (const item of insightRes.data?.data ?? []) {
      byName[item.name] = item.values?.slice(-1)[0]?.value ?? null;
    }

    return {
      followers,
      following: null,
      impressionsLast30: byName["page_impressions"] ?? null,
      reachLast30: byName["page_reach"] ?? null,
    };
  } catch (err) {
    console.warn(`[analytics] FB account metrics failed: ${err.message}`);
    return null;
  }
}

async function fetchInstagramAccountMetrics(igUserId, accessToken) {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${igUserId}`,
      {
        params: {
          fields: "followers_count,follows_count,media_count",
          access_token: accessToken,
        },
      }
    );

    return {
      followers: data.followers_count ?? null,
      following: data.follows_count ?? null,
      totalPosts: data.media_count ?? null,
      impressionsLast30: null,
      reachLast30: null,
    };
  } catch (err) {
    console.warn(`[analytics] IG account metrics failed: ${err.message}`);
    return null;
  }
}

// ── YouTube ───────────────────────────────────────────────────────────────────

async function fetchYouTubePostMetrics(videoId, accessToken) {
  try {
    const { data } = await axios.get(
      "https://youtubeanalytics.googleapis.com/v2/reports",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          ids: "channel==MINE",
          startDate: "2020-01-01",
          endDate: new Date().toISOString().slice(0, 10),
          metrics:
            "views,comments,likes,dislikes,shares,estimatedMinutesWatched,averageViewDuration",
          filters: `video==${videoId}`,
          dimensions: "video",
        },
      }
    );

    const row = data?.rows?.[0];
    if (!row) return null;
    const [, views, comments, likes, , shares, watchMinutes, avgDuration] = row;
    const engTotal = (likes || 0) + (comments || 0) + (shares || 0);
    const engagementRate =
      views && views > 0 ? parseFloat(((engTotal / views) * 100).toFixed(2)) : null;

    return {
      impressions: null,
      reach: null,
      likes: likes ?? null,
      comments: comments ?? null,
      shares: shares ?? null,
      saves: null,
      clicks: null,
      videoViews: views ?? null,
      videoWatchTime: avgDuration ? parseFloat((avgDuration / 60).toFixed(2)) : null,
      engagementRate,
    };
  } catch (err) {
    console.warn(`[analytics] YT post metrics failed for ${videoId}: ${err.message}`);
    return null;
  }
}

async function fetchYouTubeAccountMetrics(channelId, accessToken) {
  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          part: "statistics",
          id: channelId,
        },
      }
    );

    const stats = data?.items?.[0]?.statistics;
    if (!stats) return null;

    return {
      followers: parseInt(stats.subscriberCount, 10) || null,
      following: null,
      totalPosts: parseInt(stats.videoCount, 10) || null,
      impressionsLast30: null,
      reachLast30: null,
    };
  } catch (err) {
    console.warn(`[analytics] YT account metrics failed: ${err.message}`);
    return null;
  }
}

// ── TikTok (mock — Research API not yet approved) ────────────────────────────

function mockTikTokPostMetrics() {
  return {
    impressions: Math.floor(Math.random() * 5000) + 500,
    reach: Math.floor(Math.random() * 3000) + 300,
    likes: Math.floor(Math.random() * 300) + 10,
    comments: Math.floor(Math.random() * 50),
    shares: Math.floor(Math.random() * 80),
    saves: Math.floor(Math.random() * 40),
    clicks: null,
    videoViews: Math.floor(Math.random() * 4000) + 400,
    videoWatchTime: parseFloat((Math.random() * 45 + 5).toFixed(1)),
    engagementRate: parseFloat((Math.random() * 8 + 1).toFixed(2)),
  };
}

// ── Main sync functions ───────────────────────────────────────────────────────

export async function syncPostMetrics(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      platformResults: true,
      organization: { include: { platformAccounts: true } },
    },
  });
  if (!post) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const result of post.platformResults) {
    if (result.status !== "published" || !result.externalId) continue;

    const account = post.organization.platformAccounts.find(
      (a) => a.platform === result.platform
    );
    if (!account && result.platform !== "tiktok") continue;

    let metrics = null;

    if (result.platform === "facebook") {
      metrics = await fetchFacebookPostMetrics(postId, result.externalId, decrypt(account.accessToken));
    } else if (result.platform === "instagram") {
      metrics = await fetchInstagramPostMetrics(result.externalId, decrypt(account.accessToken));
    } else if (result.platform === "youtube") {
      metrics = await fetchYouTubePostMetrics(result.externalId, decrypt(account.accessToken));
    } else if (result.platform === "tiktok") {
      metrics = mockTikTokPostMetrics();
    }

    if (!metrics) continue;

    await prisma.postMetrics.upsert({
      where: { postId_platform_snapshotDate: { postId, platform: result.platform, snapshotDate: today } },
      update: { ...metrics, fetchedAt: new Date() },
      create: { postId, platform: result.platform, snapshotDate: today, ...metrics },
    });
  }
}

export async function syncAccountMetrics(organizationId) {
  const accounts = await prisma.platformAccount.findMany({
    where: { organizationId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const account of accounts) {
    let metrics = null;

    if (account.platform === "facebook") {
      metrics = await fetchFacebookAccountMetrics(account.accountId, decrypt(account.accessToken));
    } else if (account.platform === "instagram") {
      metrics = await fetchInstagramAccountMetrics(account.accountId, decrypt(account.accessToken));
    } else if (account.platform === "youtube") {
      metrics = await fetchYouTubeAccountMetrics(account.accountId, decrypt(account.accessToken));
    } else if (account.platform === "tiktok") {
      metrics = {
        followers: Math.floor(Math.random() * 2000) + 100,
        following: Math.floor(Math.random() * 500),
        totalPosts: Math.floor(Math.random() * 50) + 5,
        impressionsLast30: null,
        reachLast30: null,
      };
    }

    if (!metrics) continue;

    await prisma.accountMetrics.upsert({
      where: {
        organizationId_platform_snapshotDate: {
          organizationId,
          platform: account.platform,
          snapshotDate: today,
        },
      },
      update: { ...metrics, fetchedAt: new Date() },
      create: { organizationId, platform: account.platform, snapshotDate: today, ...metrics },
    });
  }
}

export async function syncOrgAnalytics(organizationId) {
  const platforms = ["facebook", "instagram", "youtube", "tiktok"];
  for (const platform of platforms) {
    await prisma.analyticsSync.upsert({
      where: { organizationId_platform: { organizationId, platform } },
      update: { status: "syncing" },
      create: { organizationId, platform, status: "syncing" },
    });
  }

  try {
    await syncAccountMetrics(organizationId);

    const posts = await prisma.post.findMany({
      where: { organizationId, status: "PUBLISHED" },
      include: { platformResults: true },
      orderBy: { publishedAt: "desc" },
      take: 100,
    });

    for (const post of posts) {
      await syncPostMetrics(post.id);
    }

    for (const platform of platforms) {
      await prisma.analyticsSync.upsert({
        where: { organizationId_platform: { organizationId, platform } },
        update: { status: "success", lastSyncedAt: new Date(), errorMessage: null },
        create: { organizationId, platform, status: "success", lastSyncedAt: new Date() },
      });
    }
  } catch (err) {
    console.error(`[analytics] sync failed for org ${organizationId}:`, err);
    for (const platform of platforms) {
      await prisma.analyticsSync.updateMany({
        where: { organizationId, platform, status: "syncing" },
        data: { status: "error", errorMessage: err.message },
      });
    }
  }
}
