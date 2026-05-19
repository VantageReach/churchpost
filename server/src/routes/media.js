import { Router } from "express";
import multer from "multer";
import { extname } from "path";
import { randomBytes } from "crypto";
import { requireOrgRole } from "../middleware/auth.js";
import { uploadToR2 } from "../lib/r2.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|mov)/;
    cb(null, allowed.test(file.mimetype));
  },
});

const router = Router();

// POST /api/media/upload — uploads to R2, returns public URLs
router.post(
  "/upload",
  requireOrgRole("ORG_ADMIN", "EDITOR"),
  upload.array("files", 10),
  async (req, res) => {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const assets = await Promise.all(
        req.files.map(async (file) => {
          const ext = extname(file.originalname);
          const key = `uploads/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
          const url = await uploadToR2(file.buffer, key, file.mimetype);
          return {
            url,
            filename: file.originalname,
            size: file.size,
            type: file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE",
          };
        })
      );

      res.json({ assets });
    } catch (err) {
      console.error("[Media upload]", err.message);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
