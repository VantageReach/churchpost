import { Router } from "express";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { getCalendarEntries } from "../lib/nationalCalendar.js";
import { publishPost } from "../services/publisher.js";
import { publishQueue } from "../lib/redis.js";

const router = Router();

// GET /api/posts — list all posts for the org
router.get("/", async (req, res, next) => {
  try {
    const { status, platform, limit = 50, offset = 0 } = req.query;

    const where = { organizationId: req.org.id };
    if (status) where.status = status;
    if (platform) where.platforms = { has: platform };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true } },
          mediaAssets: true,
          platformResults: true,
          postMetrics: {
            orderBy: { snapshotDate: "desc" },
            take: 4,
          },
        },
        orderBy: [
          { scheduledAt: "asc" },
          { createdAt: "desc" },
        ],
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/calendar?year=2026&month=5
// Returns posts + national calendar events for a given month
router.get("/calendar", async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) - 1 || new Date().getMonth(); // 0-indexed

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const posts = await prisma.post.findMany({
      where: {
        organizationId: req.org.id,
        OR: [
          { scheduledAt: { gte: start, lte: end } },
          { publishedAt: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end }, status: "DRAFT" },
        ],
      },
      include: {
        author: { select: { name: true } },
        mediaAssets: { take: 1 },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Load org settings for calendar filters
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: req.org.id },
    });

    const calendarFilters = {
      holidays: settings?.nationalCalendarHolidays ?? true,
      liturgical: settings?.nationalCalendarLiturgical ?? true,
      awareness: settings?.nationalCalendarAwareness ?? true,
      fun: settings?.nationalCalendarFun ?? true,
    };

    // Get national calendar entries for the month (include adjacent months for view overlap)
    const years = [...new Set([
      month === 0 ? year - 1 : year,
      year,
      month === 11 ? year + 1 : year,
    ])];

    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month + 2, 0);

    const allEntries = years
      .flatMap((y) => getCalendarEntries(y, calendarFilters))
      .filter((e) => {
        const d = new Date(e.date);
        return d >= rangeStart && d <= rangeEnd;
      });

    res.json({ posts, nationalEvents: allEntries });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mediaAssets: true,
        platformResults: true,
      },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts — create
router.post("/", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { title, captions, platforms, formats, meta, status, scheduledAt, mediaAssets } = req.body;

    if (!captions || !platforms?.length) {
      return res.status(400).json({ error: "captions and platforms are required" });
    }
    if (req.org.isDemo && status === "SCHEDULED") {
      return res.status(403).json({ error: "Scheduling is disabled in demo mode." });
    }

    const post = await prisma.post.create({
      data: {
        organizationId: req.org.id,
        authorId: req.orgUser.id,
        title: title || null,
        captions,
        platforms,
        formats: formats ?? null,
        meta: meta ?? null,
        status: status || "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mediaAssets: { include: { variants: true } },
      },
    });

    // Link pre-created MediaAsset records (uploaded before post was saved)
    const assetIds = (mediaAssets ?? []).map((a) => a.id).filter(Boolean);
    if (assetIds.length) {
      await prisma.mediaAsset.updateMany({
        where: { id: { in: assetIds }, postId: null },
        data: { postId: post.id },
      });
    }

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:id
router.put("/:id", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const existing = await prisma.post.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });

    const { title, captions, platforms, formats, meta, status, scheduledAt, mediaAssets } = req.body;

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(captions !== undefined && { captions }),
        ...(platforms !== undefined && { platforms }),
        ...(formats !== undefined && { formats }),
        ...(meta !== undefined && { meta }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        }),
        ...(mediaAssets !== undefined && {
          mediaAssets: {
            deleteMany: {},
            create: mediaAssets.map(({ url, filename, size, type }) => ({
              url,
              filename,
              size,
              type,
            })),
          },
        }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        mediaAssets: true,
        platformResults: true,
      },
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id
router.delete("/:id", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const existing = await prisma.post.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:id/publish — publish immediately
router.post("/:id/publish", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    if (req.org.isDemo) return res.status(403).json({ error: "Publishing is disabled in demo mode." });

    const post = await prisma.post.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.status === "PUBLISHED") return res.status(400).json({ error: "Post already published" });

    // Enqueue with high priority — worker will process it immediately
    await publishQueue.add("publish", { postId: post.id }, {
      jobId: `publish-${post.id}-${Date.now()}`,
      priority: 1,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });

    res.json({ queued: true });
  } catch (err) {
    next(err);
  }
});

export default router;
