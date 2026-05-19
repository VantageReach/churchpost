import { Router } from "express";
import axios from "axios";
import { randomBytes, createHash } from "crypto";
import prisma from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { requireOrgRole } from "../../middleware/auth.js";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_URL = "https://open.tiktokapis.com/v2/user/info/";
const SCOPES = "user.info.basic,video.publish";

const pendingStates = new Map();

function generatePKCE() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function storeState(orgId) {
  const state = randomBytes(24).toString("hex");
  const { verifier, challenge } = generatePKCE();
  pendingStates.set(state, { orgId, verifier });
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);
  return { state, challenge };
}

function callbackUrl() {
  return `${process.env.API_URL || "http://localhost:3001"}/api/integrations/tiktok/callback`;
}

// ── Public router: OAuth callback ─────────────────────────────────────────────
export const publicTikTokRouter = Router();

publicTikTokRouter.get("/callback", async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  const fail = (msg) =>
    res.redirect(`${CLIENT_URL}/settings/platforms?tiktok_error=${encodeURIComponent(msg)}`);

  const { code, error, state } = req.query;
  if (error || !code || !state) return fail(error || "missing_params");

  const pending = pendingStates.get(state);
  if (!pending) return fail("invalid_state");
  pendingStates.delete(state);

  const { orgId, verifier } = pending;

  try {
    const tokenRes = await axios.post(
      TIKTOK_TOKEN_URL,
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(),
        code_verifier: verifier,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in, open_id } = tokenRes.data;

    const userRes = await axios.get(`${TIKTOK_USER_URL}?fields=open_id,display_name`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const displayName = userRes.data?.data?.user?.display_name || "TikTok Account";

    await prisma.platformAccount.upsert({
      where: { organizationId_platform: { organizationId: orgId, platform: "tiktok" } },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : undefined,
        accountName: displayName,
        accountId: open_id,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        organizationId: orgId,
        platform: "tiktok",
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        accountName: displayName,
        accountId: open_id,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return res.redirect(`${CLIENT_URL}/settings/platforms?tiktok_connected=1`);
  } catch (err) {
    console.error("[TikTok callback]", err?.response?.data || err.message);
    return fail("token_exchange_failed");
  }
});

// ── Protected router ──────────────────────────────────────────────────────────
const router = Router();

// GET /api/integrations/tiktok/connect
router.get("/connect", async (req, res, next) => {
  try {
    const { state, challenge } = storeState(req.org.id);
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      scope: SCOPES,
      response_type: "code",
      redirect_uri: callbackUrl(),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    res.redirect(`${TIKTOK_AUTH_URL}?${params}`);
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/tiktok/status
router.get("/status", async (req, res, next) => {
  try {
    const account = await prisma.platformAccount.findUnique({
      where: { organizationId_platform: { organizationId: req.org.id, platform: "tiktok" } },
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

// DELETE /api/integrations/tiktok
router.delete("/", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    await prisma.platformAccount.deleteMany({
      where: { organizationId: req.org.id, platform: "tiktok" },
    });
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
});

export default router;
