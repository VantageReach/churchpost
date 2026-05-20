import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";

const router = Router();

const RESERVED_SLUGS = [
  "app", "admin", "api", "www", "mail", "support", "help",
  "billing", "status", "login", "signup", "dashboard", "churchpost",
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// GET /api/orgs/me — check current user's org membership (no org context required)
router.get("/me", async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    const orgUser = await prisma.orgUser.findFirst({
      where: {
        clerkId: userId,
        NOT: { clerkId: { startsWith: "pending:" } },
      },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!orgUser) return res.json({ hasOrg: false });

    res.json({
      hasOrg: true,
      org: {
        id: orgUser.organization.id,
        name: orgUser.organization.name,
        slug: orgUser.organization.slug,
        plan: orgUser.organization.plan,
        createdAt: orgUser.organization.createdAt,
      },
      user: {
        id: orgUser.id,
        name: orgUser.name,
        email: orgUser.email,
        role: orgUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/check-slug?slug=xxx — check slug availability
router.get("/check-slug", async (req, res, next) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.json({ available: false, reason: "No slug provided." });

    if (RESERVED_SLUGS.includes(slug)) {
      return res.json({ available: false, reason: "That name is reserved." });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.json({ available: false, reason: "Only lowercase letters, numbers, and hyphens." });
    }

    const existing = await prisma.organization.findUnique({ where: { slug } });
    res.json({ available: !existing });
  } catch (err) {
    next(err);
  }
});

// POST /api/orgs — create a new organization (no org context required)
router.post("/", async (req, res, next) => {
  try {
    const { userId, sessionClaims } = getAuth(req);
    const { name, slug, timezone = "America/Chicago" } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Church name is required." });

    const finalSlug = slug?.trim() || generateSlug(name.trim());

    if (!finalSlug) return res.status(400).json({ error: "Could not generate a valid slug from that name." });
    if (!/^[a-z0-9-]+$/.test(finalSlug)) {
      return res.status(400).json({ error: "Slug can only contain lowercase letters, numbers, and hyphens." });
    }
    if (RESERVED_SLUGS.includes(finalSlug)) {
      return res.status(400).json({ error: "That name is reserved. Please choose a different one." });
    }

    const existing = await prisma.organization.findUnique({ where: { slug: finalSlug } });
    if (existing) return res.status(409).json({ error: "That slug is already taken. Please choose another." });

    const existingMembership = await prisma.orgUser.findFirst({
      where: { clerkId: userId, NOT: { clerkId: { startsWith: "pending:" } } },
    });
    if (existingMembership) {
      return res.status(409).json({ error: "You already belong to an organization." });
    }

    const userEmail = (
      sessionClaims?.email || sessionClaims?.primaryEmail || ""
    ).toLowerCase();
    const userName =
      [sessionClaims?.firstName, sessionClaims?.lastName].filter(Boolean).join(" ") ||
      sessionClaims?.fullName ||
      "Admin";

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          plan: "FREE",
          settings: { create: { timezone } },
        },
      });

      await tx.orgUser.create({
        data: {
          organizationId: newOrg.id,
          clerkId: userId,
          name: userName,
          email: userEmail || `${userId}@placeholder.local`,
          role: "ORG_ADMIN",
        },
      });

      return newOrg;
    });

    res.status(201).json({ org });
  } catch (err) {
    next(err);
  }
});

export default router;
