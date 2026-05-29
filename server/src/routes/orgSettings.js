import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";
import { checkPlatformAdmin } from "../middleware/platformAdmin.js";

const router = Router();

// Public — brand colors are needed before auth (login page).
// Resolves org from the signed-in user's membership, or falls back to first org.
router.get("/", async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    let org = null;

    // Platform admin impersonation: X-Admin-Org header overrides org resolution
    const adminOrgId = req.headers["x-admin-org"];
    if (adminOrgId && userId && (await checkPlatformAdmin(userId))) {
      org = await prisma.organization.findUnique({ where: { id: adminOrgId } });
    }

    // Normal resolution: user's first org membership
    if (!org && userId) {
      const membership = await prisma.orgUser.findFirst({
        where: { clerkId: userId },
        include: { organization: true },
        orderBy: { joinedAt: "asc" },
      });
      org = membership?.organization ?? null;
    }

    // Fallback: first org (covers unauthenticated login page + brand loading)
    if (!org) {
      org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!org) {
      return res.status(404).json({ error: "No organization found." });
    }

    // Auto-create OrgSettings with defaults if the org doesn't have them yet
    const settings = await prisma.orgSettings.upsert({
      where: { organizationId: org.id },
      update: {},
      create: { organizationId: org.id },
    });

    res.json({
      ...settings,
      orgName: org.name,
      orgSlug: org.slug,
      orgPlan: org.plan,
      isDemo: org.isDemo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
