import { Router } from "express";
import { getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";

const router = Router();

// Public — brand colors are needed before auth (login page).
// Resolves org from the signed-in user's membership, or falls back to first org.
router.get("/", async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    let org = null;

    if (userId) {
      const membership = await prisma.orgUser.findFirst({
        where: { clerkId: userId },
        include: { organization: true },
        orderBy: { joinedAt: "asc" },
      });
      org = membership?.organization ?? null;
    }

    // Fallback: first org (covers unauthenticated login page + brand loading)
    if (!org) {
      org = await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }

    if (!org) {
      return res
        .status(404)
        .json({ error: "No organization found. Run: npm run db:seed" });
    }

    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: org.id },
    });

    if (!settings) {
      return res
        .status(404)
        .json({ error: "OrgSettings not found. Run: npm run db:seed" });
    }

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
