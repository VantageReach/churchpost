import { clerkClient } from "@clerk/express";

// Simple in-memory cache to avoid hitting Clerk on every request
const emailCache = new Map(); // userId -> { email, ts }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getEmailForUser(userId) {
  const cached = emailCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.email;
  const user = await clerkClient.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "";
  emailCache.set(userId, { email, ts: Date.now() });
  return email;
}

export async function requirePlatformAdmin(req, res, next) {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.length) {
    return res.status(403).json({ error: "PLATFORM_ADMIN_EMAILS not configured" });
  }

  try {
    const email = await getEmailForUser(userId);
    if (!adminEmails.includes(email)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.platformAdminEmail = email;
    next();
  } catch (err) {
    next(err);
  }
}

// Non-throwing version used by the /me endpoint
export async function checkPlatformAdmin(userId) {
  if (!userId) return false;
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.length) return false;
  try {
    const email = await getEmailForUser(userId);
    return adminEmails.includes(email);
  } catch {
    return false;
  }
}
