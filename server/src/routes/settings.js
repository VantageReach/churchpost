import { Router } from "express";
import multer from "multer";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, "../../uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, `logo-${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for logos
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|png|gif|webp|svg\+xml)/.test(file.mimetype));
  },
});

const router = Router();

// GET /api/settings — full settings for the settings page
router.get("/", async (req, res, next) => {
  try {
    const settings = await prisma.orgSettings.findUnique({
      where: { organizationId: req.org.id },
    });
    res.json({
      ...settings,
      orgName: req.org.name,
      orgSlug: req.org.slug,
      orgPlan: req.org.plan,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings — update org settings (admin only)
router.put("/", requireOrgRole("ORG_ADMIN"), async (req, res, next) => {
  try {
    const {
      orgName,
      brandPrimaryColor,
      brandSecondaryColor,
      brandTextOnPrimary,
      brandFontFamily,
      logoFullUrl,
      logoIconUrl,
      logoDarkUrl,
      timezone,
      aiSystemPrompt,
      nationalCalendarHolidays,
      nationalCalendarAwareness,
      nationalCalendarLiturgical,
      nationalCalendarFun,
      proactiveSuggestions,
    } = req.body;

    const [org, settings] = await Promise.all([
      orgName !== undefined
        ? prisma.organization.update({
            where: { id: req.org.id },
            data: { name: orgName },
          })
        : Promise.resolve(req.org),
      prisma.orgSettings.update({
        where: { organizationId: req.org.id },
        data: {
          ...(brandPrimaryColor !== undefined && { brandPrimaryColor }),
          ...(brandSecondaryColor !== undefined && { brandSecondaryColor }),
          ...(brandTextOnPrimary !== undefined && { brandTextOnPrimary }),
          ...(brandFontFamily !== undefined && { brandFontFamily }),
          ...(logoFullUrl !== undefined && { logoFullUrl }),
          ...(logoIconUrl !== undefined && { logoIconUrl }),
          ...(logoDarkUrl !== undefined && { logoDarkUrl }),
          ...(timezone !== undefined && { timezone }),
          ...(aiSystemPrompt !== undefined && { aiSystemPrompt }),
          ...(nationalCalendarHolidays !== undefined && { nationalCalendarHolidays }),
          ...(nationalCalendarAwareness !== undefined && { nationalCalendarAwareness }),
          ...(nationalCalendarLiturgical !== undefined && { nationalCalendarLiturgical }),
          ...(nationalCalendarFun !== undefined && { nationalCalendarFun }),
          ...(proactiveSuggestions !== undefined && { proactiveSuggestions }),
        },
      }),
    ]);

    res.json({
      ...settings,
      orgName: org.name,
      orgSlug: org.slug,
      orgPlan: org.plan,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/logo/:type — upload a logo (icon | full | dark)
router.post(
  "/logo/:type",
  requireOrgRole("ORG_ADMIN"),
  logoUpload.single("file"),
  async (req, res, next) => {
    try {
      const { type } = req.params;
      if (!["icon", "full", "dark"].includes(type)) {
        return res.status(400).json({ error: "type must be icon, full, or dark" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const urlField = { icon: "logoIconUrl", full: "logoFullUrl", dark: "logoDarkUrl" }[type];
      const url = `/uploads/${req.file.filename}`;

      const settings = await prisma.orgSettings.update({
        where: { organizationId: req.org.id },
        data: { [urlField]: url },
      });

      res.json({ url, settings });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
