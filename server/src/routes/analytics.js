import { Router } from "express";
import prisma from "../lib/prisma.js";
import { enqueueOrgAnalyticsSync } from "../workers/analyticsWorker.js";

const router = Router();

// GET /api/analytics/overview
// Summary stats: total published, total reach/impressions/engagement across all posts
router.get("/overview", async (req, res) => {
  const organizationId = req.org.id;
  const { days = "30" } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const [postMetrics, accountMetrics, syncStatuses] = await Promise.all([
    prisma.postMetrics.findMany({
      where: {
        post: { organizationId },
        snapshotDate: { gte: since },
      },
    }),
    prisma.accountMetrics.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: since },
      },
      orderBy: { snapshotDate: "desc" },
    }),
    prisma.analyticsSync.findMany({ where: { organizationId } }),
  ]);

  const sum = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0);

  // Latest account snapshot per platform
  const latestAccount = {};
  for (const m of accountMetrics) {
    if (!latestAccount[m.platform]) latestAccount[m.platform] = m;
  }

  const totalFollowers = Object.values(latestAccount).reduce(
    (s, m) => s + (m.followers || 0),
    0
  );

  const overview = {
    totalPosts: await prisma.post.count({
      where: { organizationId, status: "PUBLISHED", publishedAt: { gte: since } },
    }),
    totalImpressions: sum(postMetrics, "impressions"),
    totalReach: sum(postMetrics, "reach"),
    totalLikes: sum(postMetrics, "likes"),
    totalComments: sum(postMetrics, "comments"),
    totalShares: sum(postMetrics, "shares"),
    totalVideoViews: sum(postMetrics, "videoViews"),
    totalFollowers,
    avgEngagementRate:
      postMetrics.length > 0
        ? parseFloat(
            (
              postMetrics
                .filter((m) => m.engagementRate != null)
                .reduce((s, m) => s + m.engagementRate, 0) /
              Math.max(postMetrics.filter((m) => m.engagementRate != null).length, 1)
            ).toFixed(2)
          )
        : null,
    accountMetrics: latestAccount,
    syncStatuses: Object.fromEntries(syncStatuses.map((s) => [s.platform, s])),
  };

  res.json(overview);
});

// GET /api/analytics/posts
// Per-post metrics for posts published in the window, most recent snapshot
router.get("/posts", async (req, res) => {
  const organizationId = req.org.id;
  const { days = "30", platform, limit = "50", offset = "0" } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const posts = await prisma.post.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      publishedAt: { gte: since },
      ...(platform && platform !== "all" ? { platforms: { has: platform } } : {}),
    },
    include: {
      postMetrics: { orderBy: { snapshotDate: "desc" }, take: 4 },
      platformResults: true,
      mediaAssets: { take: 1 },
    },
    orderBy: { publishedAt: "desc" },
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
  });

  // Collapse metrics: one object per platform (most recent snapshot)
  const result = posts.map((post) => {
    const metricsByPlatform = {};
    for (const m of post.postMetrics) {
      if (!metricsByPlatform[m.platform]) metricsByPlatform[m.platform] = m;
    }
    return {
      id: post.id,
      title: post.title,
      captions: post.captions,
      platforms: post.platforms,
      publishedAt: post.publishedAt,
      thumbnail: post.mediaAssets?.[0]?.url ?? null,
      platformResults: post.platformResults,
      metrics: metricsByPlatform,
    };
  });

  res.json({ posts: result, total: result.length });
});

// GET /api/analytics/posts/:postId
// Full time-series metrics for a single post (all snapshots)
router.get("/posts/:postId", async (req, res) => {
  const organizationId = req.org.id;
  const { postId } = req.params;

  const post = await prisma.post.findFirst({
    where: { id: postId, organizationId },
    include: {
      postMetrics: { orderBy: { snapshotDate: "asc" } },
      platformResults: true,
      mediaAssets: { take: 1 },
    },
  });

  if (!post) return res.status(404).json({ error: "Post not found" });

  res.json({
    id: post.id,
    title: post.title,
    captions: post.captions,
    platforms: post.platforms,
    publishedAt: post.publishedAt,
    thumbnail: post.mediaAssets?.[0]?.url ?? null,
    platformResults: post.platformResults,
    metrics: post.postMetrics,
  });
});

// GET /api/analytics/account
// Account-level follower / impression time-series per platform
router.get("/account", async (req, res) => {
  const organizationId = req.org.id;
  const { days = "90", platform } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const metrics = await prisma.accountMetrics.findMany({
    where: {
      organizationId,
      snapshotDate: { gte: since },
      ...(platform && platform !== "all" ? { platform } : {}),
    },
    orderBy: { snapshotDate: "asc" },
  });

  res.json({ metrics });
});

// POST /api/analytics/sync
// Trigger a full analytics refresh for this org
router.post("/sync", async (req, res) => {
  const organizationId = req.org.id;

  if (req.org.isDemo) {
    return res.status(403).json({ error: "Analytics sync is disabled in demo mode." });
  }

  await enqueueOrgAnalyticsSync(organizationId);
  res.json({ queued: true });
});

export default router;
