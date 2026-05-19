import { Router } from "express";
import axios from "axios";
import prisma from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { requireOrgRole } from "../../middleware/auth.js";

const FB_VERSION = "v19.0";
const FB_BASE = `https://graph.facebook.com/${FB_VERSION}`;
const FB_AUTH_URL = `https://www.facebook.com/${FB_VERSION}/dialog/oauth`;
const SCOPES = "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,public_profile";

// Encode orgId + expiry into the state token so it survives server restarts
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
  return `${process.env.API_URL || "http://localhost:3001"}/api/integrations/meta/callback`;
}

// ── Public router: OAuth callback ─────────────────────────────────────────────
export const publicMetaRouter = Router();

publicMetaRouter.get("/callback", async (req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  console.log("[Meta callback] CLIENT_URL:", CLIENT_URL, "query:", JSON.stringify(req.query));
  const fail = (msg) =>
    res.redirect(`${CLIENT_URL}/settings/platforms?meta_error=${encodeURIComponent(msg)}`);

  const { code, error, state } = req.query;
  if (error || !code || !state) return fail(error || "missing_params");

  const orgId = readState(state);
  if (!orgId) return fail("invalid_state");

  try {
    // 1. Exchange code for short-lived user token
    const tokenRes = await axios.get(`${FB_BASE}/oauth/access_token`, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: callbackUrl(),
        code,
      },
    });
    const shortToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived user token (60 days)
    const longRes = await axios.get(`${FB_BASE}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;
    const expiresIn = longRes.data.expires_in; // seconds

    // 3. Get pages the user manages (page tokens are long-lived when derived from long-lived user token)
    const pagesRes = await axios.get(`${FB_BASE}/me/accounts`, {
      params: { access_token: longToken, fields: "id,name,access_token,category" },
    });
    const pages = pagesRes.data.data ?? [];
    if (pages.length === 0) return fail("no_pages_found");

    // Use the first page (most orgs have one church page)
    const page = pages[0];

    // Upsert Facebook page connection
    await prisma.platformAccount.upsert({
      where: { organizationId_platform: { organizationId: orgId, platform: "facebook" } },
      update: {
        accessToken: encrypt(page.access_token),
        accountName: page.name,
        accountId: page.id,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
      create: {
        organizationId: orgId,
        platform: "facebook",
        accessToken: encrypt(page.access_token),
        accountName: page.name,
        accountId: page.id,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      },
    });

    // 4. Check for linked Instagram Business Account
    try {
      const igRes = await axios.get(`${FB_BASE}/${page.id}`, {
        params: {
          fields: "instagram_business_account",
          access_token: page.access_token,
        },
      });
      const igAccount = igRes.data.instagram_business_account;

      if (igAccount?.id) {
        // Get Instagram username
        const igDetailRes = await axios.get(`${FB_BASE}/${igAccount.id}`, {
          params: { fields: "id,username", access_token: page.access_token },
        });
        const igUsername = igDetailRes.data.username || "Instagram";

        await prisma.platformAccount.upsert({
          where: { organizationId_platform: { organizationId: orgId, platform: "instagram" } },
          update: {
            accessToken: encrypt(page.access_token), // IG publishing uses page token
            accountName: `@${igUsername}`,
            accountId: igAccount.id,
            expiresAt: null,
          },
          create: {
            organizationId: orgId,
            platform: "instagram",
            accessToken: encrypt(page.access_token),
            accountName: `@${igUsername}`,
            accountId: igAccount.id,
            expiresAt: null,
          },
        });
      }
    } catch {
      // Instagram not linked — non-fatal, Facebook still connected
    }

    return res.redirect(`${CLIENT_URL}/settings/platforms?meta_connected=1`);
  } catch (err) {
    console.error("[Meta callback]", err?.response?.data || err.message);
    return fail("token_exchange_failed");
  }
});

// ── Protected router ──────────────────────────────────────────────────────────
const router = Router();

// GET /api/integrations/meta/connect
router.get("/connect", async (req, res, next) => {
  try {
    const state = storeState(req.org.id);
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      redirect_uri: callbackUrl(),
      scope: SCOPES,
      response_type: "code",
      state,
    });
    const redirectUrl = `${FB_AUTH_URL}?${params}`;
    console.log("[Meta connect] redirecting to:", redirectUrl.slice(0, 120));
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("[Meta connect] error:", err.message);
    next(err);
  }
});

// GET /api/integrations/meta/status
router.get("/status", async (req, res, next) => {
  try {
    const accounts = await prisma.platformAccount.findMany({
      where: {
        organizationId: req.org.id,
        platform: { in: ["facebook", "instagram"] },
      },
    });

    const fb = accounts.find((a) => a.platform === "facebook");
    const ig = accounts.find((a) => a.platform === "instagram");

    res.json({
      facebook: fb
        ? { connected: true, accountName: fb.accountName, accountId: fb.accountId, connectedAt: fb.connectedAt }
        : { connected: false },
      instagram: ig
        ? { connected: true, accountName: ig.accountName, accountId: ig.accountId, connectedAt: ig.connectedAt }
        : { connected: false },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/integrations/meta/:platform
router.delete("/:platform", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const { platform } = req.params;
    if (!["facebook", "instagram"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    await prisma.platformAccount.deleteMany({
      where: { organizationId: req.org.id, platform },
    });

    // If disconnecting Facebook, also remove Instagram (it relies on the page token)
    if (platform === "facebook") {
      await prisma.platformAccount.deleteMany({
        where: { organizationId: req.org.id, platform: "instagram" },
      });
    }

    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
});

export default router;
