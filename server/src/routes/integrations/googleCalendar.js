import { Router } from "express";
import axios from "axios";
import prisma from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { requireOrgRole } from "../../middleware/auth.js";
import { syncGoogleCalendar } from "../../services/googleCalendarSync.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ── Encrypted state helpers ───────────────────────────────────────────────────

function storeState(orgId) {
  const payload = JSON.stringify({ orgId, exp: Date.now() + 10 * 60 * 1000 });
  return encrypt(payload);
}

function readState(state) {
  try {
    const payload = JSON.parse(decrypt(state));
    if (Date.now() > payload.exp) return null;
    return payload.orgId;
  } catch {
    return null;
  }
}

function callbackUrl() {
  return `${process.env.API_URL || "http://localhost:3001"}/api/integrations/google-calendar/callback`;
}

// ── Public router: OAuth callback ─────────────────────────────────────────────
export const publicGoogleCalendarRouter = Router();

publicGoogleCalendarRouter.get("/callback", async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  console.log("[GCal callback] query:", JSON.stringify(req.query));
  const fail = (msg) =>
    res.redirect(
      `${CLIENT_URL}/settings/calendar?gcal_error=${encodeURIComponent(msg)}`
    );

  const { code, error, state } = req.query;
  if (error || !code || !state) return fail(error || "missing_params");

  const orgId = readState(state);
  if (!orgId) return fail("invalid_state");

  try {
    // 1. Exchange code for tokens
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // 2. Get user email
    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const email = userInfoRes.data.email;

    // 3. Upsert GoogleCalendarConnection
    await prisma.googleCalendarConnection.upsert({
      where: {
        organizationId_purpose: { organizationId: orgId, purpose: "events" },
      },
      update: {
        email,
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        tokenExpiresAt: expires_in
          ? new Date(Date.now() + expires_in * 1000)
          : null,
      },
      create: {
        organizationId: orgId,
        purpose: "events",
        email,
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : "",
        tokenExpiresAt: expires_in
          ? new Date(Date.now() + expires_in * 1000)
          : null,
        calendarId: "primary",
      },
    });

    // 4. Fire-and-forget initial sync
    syncGoogleCalendar(orgId).catch(console.error);

    return res.redirect(`${CLIENT_URL}/settings/calendar?gcal_connected=1`);
  } catch (err) {
    console.error("[GCal callback]", err?.response?.data || err.message);
    return fail("token_exchange_failed");
  }
});

// ── Protected router ──────────────────────────────────────────────────────────
const router = Router();

// GET /api/integrations/google-calendar/connect
// Returns OAuth URL as JSON — caller navigates client-side
router.get("/connect", async (req, res, next) => {
  try {
    const state = storeState(req.org.id);
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl(),
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    res.json({ url: `${GOOGLE_AUTH_URL}?${params}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/google-calendar/status
router.get("/status", async (req, res, next) => {
  try {
    const connection = await prisma.googleCalendarConnection.findFirst({
      where: { organizationId: req.org.id, purpose: "events" },
    });

    if (!connection) return res.json({ connected: false });

    const eventCount = await prisma.googleCalendarEvent.count({
      where: { organizationId: req.org.id },
    });

    res.json({
      connected: true,
      email: connection.email,
      lastSyncedAt: connection.lastSyncedAt,
      syncStatus: connection.syncStatus,
      errorMessage: connection.errorMessage,
      eventCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/google-calendar/sync
router.post("/sync", async (req, res, next) => {
  try {
    await prisma.googleCalendarConnection.updateMany({
      where: { organizationId: req.org.id, purpose: "events" },
      data: { syncStatus: "syncing" },
    });

    syncGoogleCalendar(req.org.id).catch(console.error);

    res.json({ syncing: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/integrations/google-calendar
router.delete("/", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    await prisma.googleCalendarConnection.deleteMany({
      where: { organizationId: req.org.id, purpose: "events" },
    });
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
});

export default router;
