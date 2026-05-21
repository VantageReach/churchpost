import { Router } from "express";
import { createClerkClient } from "@clerk/express";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();

function getClerk() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

// GET /api/team — list all members + pending invites
router.get("/", async (req, res, next) => {
  try {
    const members = await prisma.orgUser.findMany({
      where: { organizationId: req.org.id },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    const active = members.filter((m) => !m.clerkId.startsWith("pending:"));
    const pending = members.filter((m) => m.clerkId.startsWith("pending:"));

    // Enrich active members with live Clerk data (real name + email)
    const clerk = getClerk();
    const enriched = await Promise.all(
      active.map(async (m) => {
        try {
          const u = await clerk.users.getUser(m.clerkId);
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || m.name;
          const email = u.emailAddresses?.[0]?.emailAddress || m.email;
          return { ...m, name, email };
        } catch {
          return m;
        }
      })
    );

    res.json({ members: enriched, pending });
  } catch (err) {
    next(err);
  }
});

// POST /api/team/invite — invite by email
router.post("/invite", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const { email, role = "EDITOR" } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "email is required" });
    if (!["ORG_ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return res.status(400).json({ error: "invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if already a member or already invited
    const existing = await prisma.orgUser.findFirst({
      where: { organizationId: req.org.id, email: normalizedEmail },
    });
    if (existing) {
      return res.status(409).json({
        error: existing.clerkId.startsWith("pending:")
          ? "This person has already been invited."
          : "This person is already a team member.",
      });
    }

    // Create pending OrgUser — clerkId linked when they first sign in
    const invite = await prisma.orgUser.create({
      data: {
        organizationId: req.org.id,
        clerkId: `pending:${normalizedEmail}`,
        name: normalizedEmail.split("@")[0],
        email: normalizedEmail,
        role,
      },
    });

    // Send Clerk invitation email (best-effort — don't fail if Clerk rejects)
    try {
      const clerk = getClerk();
      await clerk.invitations.createInvitation({
        emailAddress: normalizedEmail,
        redirectUrl: process.env.CLIENT_URL || "http://localhost:5173",
        publicMetadata: { orgSlug: req.org.slug, role },
        ignoreExisting: true,
      });
    } catch (clerkErr) {
      console.warn("Clerk invitation failed (invite still created in DB):", clerkErr.message);
    }

    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
});

// PUT /api/team/:id/role — change a member's role
router.put("/:id/role", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["ORG_ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return res.status(400).json({ error: "invalid role" });
    }

    const member = await prisma.orgUser.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });

    // Prevent demoting the last admin
    if (member.role === "ORG_ADMIN" && role !== "ORG_ADMIN") {
      const adminCount = await prisma.orgUser.count({
        where: { organizationId: req.org.id, role: "ORG_ADMIN" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot remove the last admin" });
      }
    }

    const updated = await prisma.orgUser.update({
      where: { id: req.params.id },
      data: { role },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/team/:id — remove a member
router.delete("/:id", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const member = await prisma.orgUser.findFirst({
      where: { id: req.params.id, organizationId: req.org.id },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });

    // Prevent removing yourself
    if (member.clerkId === req.orgUser.clerkId) {
      return res.status(400).json({ error: "You cannot remove yourself" });
    }

    // Prevent removing the last admin
    if (member.role === "ORG_ADMIN") {
      const adminCount = await prisma.orgUser.count({
        where: { organizationId: req.org.id, role: "ORG_ADMIN" },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot remove the last admin" });
      }
    }

    await prisma.orgUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
