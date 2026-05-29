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
          settings: { select: { orgName: true, logoIconUrl: true, primaryColor: true } },
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

// PATCH /api/admin/orgs/:id — update plan or isDemo flag
router.patch("/orgs/:id", async (req, res, next) => {
  try {
    const { plan, isDemo, name } = req.body;
    const data = {};
    if (plan !== undefined) data.plan = plan;
    if (isDemo !== undefined) data.isDemo = isDemo;
    if (name !== undefined) data.name = name;

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
