import { requireAuth, getAuth } from "@clerk/express";
import prisma from "../lib/prisma.js";

// Enforce a valid Clerk session
export const protect = requireAuth();

// Resolve the org from the request + find/create the OrgUser record.
// In production: resolves from subdomain or custom domain.
// In local dev: uses the user's existing org membership, or falls back to first org.
export async function resolveOrgAndUser(req, res, next) {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId) return next();

  try {
    const org = await resolveOrg(req, userId);

    if (!org) {
      return res.status(404).json({ error: "Organization not found." });
    }

    req.org = org;

    // Find or create the OrgUser for this org
    let orgUser = await prisma.orgUser.findUnique({
      where: {
        organizationId_clerkId: {
          organizationId: org.id,
          clerkId: userId,
        },
      },
    });

    if (!orgUser) {
      const userEmail = (
        sessionClaims?.email ||
        sessionClaims?.primaryEmail ||
        ""
      ).toLowerCase();

      // Check for a pending invite matching this email
      const pendingInvite = userEmail
        ? await prisma.orgUser.findFirst({
            where: {
              organizationId: org.id,
              clerkId: `pending:${userEmail}`,
            },
          })
        : null;

      if (pendingInvite) {
        // Link the real clerkId to the pending invite record
        orgUser = await prisma.orgUser.update({
          where: { id: pendingInvite.id },
          data: {
            clerkId: userId,
            name:
              [sessionClaims?.firstName, sessionClaims?.lastName]
                .filter(Boolean)
                .join(" ") || pendingInvite.name,
          },
        });
        console.log(`Linked invited user ${userEmail} to org ${org.name} as ${orgUser.role}`);
      } else {
        // First user into this org becomes the Org Admin automatically
        const adminCount = await prisma.orgUser.count({
          where: { organizationId: org.id, role: "ORG_ADMIN" },
        });

        orgUser = await prisma.orgUser.create({
          data: {
            organizationId: org.id,
            clerkId: userId,
            name:
              [sessionClaims?.firstName, sessionClaims?.lastName]
                .filter(Boolean)
                .join(" ") ||
              sessionClaims?.fullName ||
              "New User",
            email: userEmail || `${userId}@placeholder.local`,
            role: adminCount === 0 ? "ORG_ADMIN" : "EDITOR",
          },
        });
      }

      console.log(
        `New OrgUser: ${orgUser.email} → ${orgUser.role} in ${org.name}`
      );
    }

    req.orgUser = orgUser;

    // Check platform-level super admin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { clerkId: userId },
    });
    req.isSuperAdmin = !!superAdmin;

    next();
  } catch (err) {
    next(err);
  }
}

async function resolveOrg(req, userId) {
  const host = req.hostname || "";
  const isLocal =
    host === "localhost" ||
    host.startsWith("127.") ||
    host === "::1" ||
    host === "";

  if (!isLocal) {
    // Production: resolve from subdomain (slug.churchpost.social) or custom domain
    if (host.endsWith(".churchpost.social")) {
      const slug = host.replace(".churchpost.social", "");
      if (slug === "admin") return null; // Super Admin portal handled separately
      return prisma.organization.findUnique({ where: { slug } });
    }
    // Custom domain
    return prisma.organization.findUnique({ where: { customDomain: host } });
  }

  // Local dev: use the user's existing org, or fall back to the first org
  const existing = await prisma.orgUser.findFirst({
    where: { clerkId: userId },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });
  if (existing) return existing.organization;

  return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
}

// Require a specific OrgRole on a route. Super Admins bypass all role checks.
export function requireOrgRole(...roles) {
  return (req, res, next) => {
    if (req.isSuperAdmin) return next();
    if (!req.orgUser) return res.status(401).json({ error: "Unauthorized" });
    if (roles.length && !roles.includes(req.orgUser.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
