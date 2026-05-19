import { Router } from "express";
import axios from "axios";
import { randomBytes } from "crypto";
import prisma from "../../lib/prisma.js";
import { encrypt } from "../../lib/encryption.js";
import { pcSyncQueue } from "../../lib/redis.js";
import { requireOrgRole } from "../../middleware/auth.js";

const PC_AUTH_URL = "https://api.planningcenteronline.com/oauth/authorize";
const TOKEN_URL = "https://api.planningcenteronline.com/oauth/token";
const SCOPES = "calendar services groups registrations people";

// In-memory state store — maps nonce → orgId with auto-expiry (10 min)
// Good enough for single-process; swap to Redis.set/get if running multiple instances.
const pendingStates = new Map();

function storeState(orgId) {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, orgId);
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);
  return state;
}

function callbackUrl() {
  return `${process.env.API_URL || "http://localhost:3001"}/api/integrations/planning-center/callback`;
}

// ── Public router: OAuth callback (no Clerk session) ──────────────────────────
export const publicPCRouter = Router();

publicPCRouter.get("/callback", async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const redirect = (err) =>
    res.redirect(`${CLIENT_URL}/settings/platforms${err ? `?pc_error=${encodeURIComponent(err)}` : "?pc_connected=1"}`);

  const { code, error, state } = req.query;

  if (error || !code || !state) return redirect(error || "missing_params");

  const orgId = pendingStates.get(state);
  if (!orgId) return redirect("invalid_state");
  pendingStates.delete(state);

  try {
    // Exchange authorization code for tokens
    const tokenRes = await axios.post(TOKEN_URL, {
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      client_id: process.env.PLANNING_CENTER_CLIENT_ID,
      client_secret: process.env.PLANNING_CENTER_CLIENT_SECRET,
    });
    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Fetch PC org name
    let pcOrgName = null;
    try {
      const meRes = await axios.get(
        "https://api.planningcenteronline.com/people/v2/me?include=organization",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      pcOrgName =
        meRes.data?.included?.find((i) => i.type === "Organization")?.attributes?.name ||
        null;
    } catch {
      // Non-fatal — org name is cosmetic
    }

    await prisma.planningCenterConnection.upsert({
      where: { organizationId: orgId },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        pcOrgName,
        syncStatus: "idle",
        errorMessage: null,
      },
      create: {
        organizationId: orgId,
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        pcOrgName,
      },
    });

    // Kick off the first sync
    await pcSyncQueue.add(
      "sync",
      { organizationId: orgId },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );

    return redirect(null);
  } catch (err) {
    console.error("[PC callback]", err?.response?.data || err.message);
    return redirect("token_exchange_failed");
  }
});

// ── Protected router: all other PC routes (Clerk auth applied in index.js) ────
const router = Router();

// GET /api/integrations/planning-center/connect — kick off OAuth flow
router.get("/connect", async (req, res, next) => {
  try {
    const state = storeState(req.org.id);
    const params = new URLSearchParams({
      client_id: process.env.PLANNING_CENTER_CLIENT_ID,
      redirect_uri: callbackUrl(),
      response_type: "code",
      scope: SCOPES,
      state,
    });
    res.redirect(`${PC_AUTH_URL}?${params}`);
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/planning-center/status
router.get("/status", async (req, res, next) => {
  try {
    const conn = await prisma.planningCenterConnection.findUnique({
      where: { organizationId: req.org.id },
    });
    if (!conn) return res.json({ connected: false });

    const upcoming = await prisma.planningCenterEvent.findMany({
      where: { organizationId: req.org.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 10,
    });

    res.json({
      connected: true,
      pcOrgName: conn.pcOrgName,
      syncStatus: conn.syncStatus,
      lastSyncedAt: conn.lastSyncedAt,
      errorMessage: conn.errorMessage,
      syncCalendar: conn.syncCalendar,
      syncServices: conn.syncServices,
      syncGroups: conn.syncGroups,
      syncRegistrations: conn.syncRegistrations,
      lookAheadDays: conn.lookAheadDays,
      syncFrequencyHours: conn.syncFrequencyHours,
      upcomingEvents: upcoming,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/planning-center/sync — manual sync
router.post("/sync", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const conn = await prisma.planningCenterConnection.findUnique({
      where: { organizationId: req.org.id },
    });
    if (!conn) return res.status(404).json({ error: "No Planning Center connection" });

    await pcSyncQueue.add(
      "sync",
      { organizationId: req.org.id },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );
    res.json({ queued: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/integrations/planning-center/settings — update sync config
router.patch("/settings", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const { syncCalendar, syncServices, syncGroups, syncRegistrations, lookAheadDays, syncFrequencyHours } =
      req.body;
    const conn = await prisma.planningCenterConnection.update({
      where: { organizationId: req.org.id },
      data: {
        ...(syncCalendar !== undefined && { syncCalendar: Boolean(syncCalendar) }),
        ...(syncServices !== undefined && { syncServices: Boolean(syncServices) }),
        ...(syncGroups !== undefined && { syncGroups: Boolean(syncGroups) }),
        ...(syncRegistrations !== undefined && { syncRegistrations: Boolean(syncRegistrations) }),
        ...(lookAheadDays !== undefined && { lookAheadDays: Number(lookAheadDays) }),
        ...(syncFrequencyHours !== undefined && { syncFrequencyHours: Number(syncFrequencyHours) }),
      },
    });
    res.json({ ok: true, conn });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/integrations/planning-center — disconnect
router.delete("/", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.planningCenterEvent.deleteMany({ where: { organizationId: req.org.id } }),
      prisma.planningCenterConnection.delete({ where: { organizationId: req.org.id } }),
    ]);
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
});

export default router;
