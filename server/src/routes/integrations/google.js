import { Router } from "express";
import axios from "axios";
import prisma from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { requireOrgRole } from "../../middleware/auth.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

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
  return `${process.env.API_URL || "http://localhost:3001"}/api/integrations/google/callback`;
}

// ── Public router: OAuth callback ─────────────────────────────────────────────
export const publicGoogleRouter = Router();

publicGoogleRouter.get("/callback", async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const fail = (msg) =>
    res.redirect(`${CLIENT_URL}/settings/platforms?google_error=${encodeURIComponent(msg)}`);

  const { code, error, state } = req.query;
  if (error || !code || !state) return fail(error || "missing_params");

  const orgId = readState(state);
  if (!orgId) return fail("invalid_state");

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(),
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Get YouTube channel info
    const channelRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const channel = channelRes.data.items?.[0];
    if (!channel) return fail("no_youtube_channel");

    const channelName = channel.snippet.title;
    const channelId = channel.id;

    await prisma.platformAccount.upsert({
      where: { organizationId_platform: { organizationId: orgId, platform: "youtube" } },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        accountName: channelName,
        accountId: channelId,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        organizationId: orgId,
        platform: "youtube",
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        accountName: channelName,
        accountId: channelId,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return res.redirect(`${CLIENT_URL}/settings/platforms?google_connected=1`);
  } catch (err) {
    console.error("[Google callback]", err?.response?.data || err.message);
    return fail("token_exchange_failed");
  }
});

// ── Protected router ──────────────────────────────────────────────────────────
const router = Router();

// GET /api/integrations/google/connect
// Returns the Google OAuth URL as JSON — caller navigates client-side
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

// GET /api/integrations/google/status
router.get("/status", async (req, res, next) => {
  try {
    const account = await prisma.platformAccount.findUnique({
      where: { organizationId_platform: { organizationId: req.org.id, platform: "youtube" } },
    });

    if (!account) return res.json({ connected: false });

    res.json({
      connected: true,
      accountName: account.accountName,
      accountId: account.accountId,
      connectedAt: account.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/integrations/google
router.delete("/", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    await prisma.platformAccount.deleteMany({
      where: { organizationId: req.org.id, platform: "youtube" },
    });
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
});

export default router;
