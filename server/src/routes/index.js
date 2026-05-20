import { Router } from "express";
import { protect, resolveOrgAndUser } from "../middleware/auth.js";
import orgSettingsRouter from "./orgSettings.js";
import orgsRouter from "./orgs.js";
import postsRouter from "./posts.js";
import mediaRouter from "./media.js";
import aiRouter from "./ai.js";
import settingsRouter from "./settings.js";
import bulkUploadRouter from "./bulkUpload.js";
import teamRouter from "./team.js";
import planningCenterRouter, { publicPCRouter } from "./integrations/planningCenter.js";
import metaRouter, { publicMetaRouter } from "./integrations/meta.js";
import googleRouter, { publicGoogleRouter } from "./integrations/google.js";
import tiktokRouter, { publicTikTokRouter } from "./integrations/tiktok.js";
import googleCalendarRouter, { publicGoogleCalendarRouter } from "./integrations/googleCalendar.js";

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.use("/org-settings", orgSettingsRouter);
// OAuth callbacks — no Clerk session required
router.use("/integrations/planning-center", publicPCRouter);
router.use("/integrations/meta", publicMetaRouter);
router.use("/integrations/google", publicGoogleRouter);
router.use("/integrations/tiktok", publicTikTokRouter);
router.use("/integrations/google-calendar", publicGoogleCalendarRouter);

// ── Protected routes (no org context required — for onboarding) ───────────────
router.use(protect);
router.use("/orgs", orgsRouter);

// ── Protected routes (org context required) ───────────────────────────────────
router.use(resolveOrgAndUser);

router.use("/posts", postsRouter);
router.use("/media", mediaRouter);
router.use("/ai", aiRouter);
router.use("/settings", settingsRouter);
router.use("/bulk-upload", bulkUploadRouter);
router.use("/team", teamRouter);
router.use("/integrations/planning-center", planningCenterRouter);
router.use("/integrations/meta", metaRouter);
router.use("/integrations/google", googleRouter);
router.use("/integrations/tiktok", tiktokRouter);
router.use("/integrations/google-calendar", googleCalendarRouter);

export default router;
