import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { requirePlatformAdmin, checkPlatformAdmin } from "../middleware/platformAdmin.js";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/admin/me — lightweight check, never throws 403 (used by frontend to gate UI)
router.get("/me", async (req, res) => {
  const isPlatformAdmin = await checkPlatformAdmin(req.auth?.userId);
  res.json({ isPlatformAdmin });
});

// All routes below require platform admin
router.use(requirePlatformAdmin);

// POST /api/admin/orgs — create a new org (pre-provision for a church)
router.post("/orgs", async (req, res, next) => {
  try {
    const { name, slug, timezone = "America/Chicago", plan = "FREE", isDemo = false } = req.body;
    if (!name?.trim() || !slug?.trim()) {
      return res.status(400).json({ error: "name and slug are required" });
    }
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const existing = await prisma.organization.findUnique({ where: { slug: cleanSlug } });
    if (existing) return res.status(409).json({ error: "That slug is already taken" });

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        plan,
        isDemo,
        settings: { create: { timezone } },
      },
      include: { settings: true, _count: { select: { users: true, posts: true } } },
    });
    res.status(201).json({ org });
  } catch (err) { next(err); }
});

// GET /api/admin/stats — platform-wide numbers
router.get("/stats", async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const [totalOrgs, totalUsers, postsThisMonth, demoOrgs, newOrgsThisMonth] = await Promise.all([
      prisma.organization.count(),
      prisma.orgUser.count(),
      prisma.post.count({ where: { publishedAt: { gte: thirtyDaysAgo } } }),
      prisma.organization.count({ where: { isDemo: true } }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);
    res.json({ totalOrgs, totalUsers, postsThisMonth, demoOrgs, newOrgsThisMonth });
  } catch (err) { next(err); }
});

// GET /api/admin/orgs — paginated org list with counts
router.get("/orgs", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const search = req.query.search?.trim() || "";

    const where = search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
      : {};

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { users: true, posts: true } },
          settings: { select: { logoIconUrl: true, brandPrimaryColor: true } },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    res.json({ orgs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/admin/orgs/:id — single org detail with members
router.get("/orgs/:id", async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        settings: true,
        users: { orderBy: { createdAt: "asc" } },
        _count: { select: { posts: true, mediaAssets: true } },
      },
    });
    if (!org) return res.status(404).json({ error: "Org not found" });

    // Enrich members with Clerk user info (batch)
    let members = org.users;
    try {
      const clerkUsers = await clerkClient.users.getUserList({
        userId: org.users.map((u) => u.clerkId),
        limit: 100,
      });
      const byId = Object.fromEntries(clerkUsers.data.map((u) => [u.id, u]));
      members = org.users.map((u) => {
        const cu = byId[u.clerkId];
        return {
          ...u,
          email: cu?.emailAddresses?.[0]?.emailAddress ?? null,
          name: cu ? `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim() : null,
          imageUrl: cu?.imageUrl ?? null,
        };
      });
    } catch { /* Clerk enrichment is best-effort */ }

    // Post counts by status
    const postCounts = await prisma.post.groupBy({
      by: ["status"],
      where: { organizationId: org.id },
      _count: true,
    });

    res.json({ org: { ...org, users: members }, postCounts });
  } catch (err) { next(err); }
});

// PATCH /api/admin/orgs/:id — update plan, isDemo, name, or slug
router.patch("/orgs/:id", async (req, res, next) => {
  try {
    const { plan, isDemo, name, slug } = req.body;
    const data = {};
    if (plan !== undefined) data.plan = plan;
    if (isDemo !== undefined) data.isDemo = isDemo;
    if (name !== undefined) data.name = name.trim();
    if (slug !== undefined) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await prisma.organization.findFirst({
        where: { slug: cleanSlug, NOT: { id: req.params.id } },
      });
      if (existing) return res.status(409).json({ error: "That slug is already taken" });
      data.slug = cleanSlug;
    }

    const org = await prisma.organization.update({ where: { id: req.params.id }, data });
    res.json({ org });
  } catch (err) { next(err); }
});

// DELETE /api/admin/orgs/:id — hard delete (cascades)
router.delete("/orgs/:id", async (req, res, next) => {
  try {
    await prisma.organization.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
