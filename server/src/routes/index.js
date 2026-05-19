import { Router } from "express";
import { protect, resolveOrgAndUser } from "../middleware/auth.js";
import orgSettingsRouter from "./orgSettings.js";
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

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.use("/org-settings", orgSettingsRouter);
// OAuth callbacks — no Clerk session required
router.use("/integrations/planning-center", publicPCRouter);
router.use("/integrations/meta", publicMetaRouter);
router.use("/integrations/google", publicGoogleRouter);
router.use("/integrations/tiktok", publicTikTokRouter);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);
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

export default router;
