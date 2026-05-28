import { Router } from "express";
import multer from "multer";
import { extname } from "path";
import { randomBytes } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, rm } from "fs/promises";
import axios from "axios";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { requireOrgRole } from "../middleware/auth.js";
import { uploadToR2 } from "../lib/r2.js";
import prisma from "../lib/prisma.js";

ffmpeg.setFfmpegPath(ffmpegStatic);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|mov)/;
    cb(null, allowed.test(file.mimetype));
  },
});

// Standard output dimensions per ratio
const OUTPUT_DIMS = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "4:5":  { width: 1080, height: 1350 },
};

const router = Router();

// POST /api/media/upload — uploads to R2, creates MediaAsset record, returns asset data
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
          const type = file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE";

          // Get image dimensions
          let width = null, height = null;
          if (type === "IMAGE") {
            try {
              const meta = await sharp(file.buffer).metadata();
              width = meta.width ?? null;
              height = meta.height ?? null;
            } catch {}
          }

          // Create DB record (postId null until post is saved)
          const asset = await prisma.mediaAsset.create({
            data: {
              type,
              url,
              originalUrl: url,
              filename: file.originalname,
              size: file.size,
              width,
              height,
            },
          });

          return { id: asset.id, url, filename: file.originalname, size: file.size, type, width, height };
        })
      );

      res.json({ assets });
    } catch (err) {
      console.error("[Media upload]", err.message);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// POST /api/media/crop — crop an image asset to a target ratio
// Body: { assetId, platform, format, aspectRatio, cropData: { zoom, offsetX, offsetY, rotation } }
router.post("/crop", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { assetId, platform, format, aspectRatio, cropData } = req.body;
    if (!assetId || !platform || !format || !aspectRatio || !cropData) {
      return res.status(400).json({ error: "assetId, platform, format, aspectRatio, and cropData are required" });
    }

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    if (asset.type !== "IMAGE") return res.status(400).json({ error: "Use /process-video for video assets" });

    const srcUrl = asset.originalUrl ?? asset.url;

    // Fetch original from R2
    const response = await axios.get(srcUrl, { responseType: "arraybuffer" });
    const srcBuffer = Buffer.from(response.data);

    const img = sharp(srcBuffer);
    const meta = await img.metadata();
    const natW = meta.width;
    const natH = meta.height;

    // Parse target ratio
    const [rw, rh] = aspectRatio.split(":").map(Number);
    const frameAspect = rw / rh;

    // Auto-fill scale: scale image so it just covers the frame at zoom=1
    const fillScaleX = (natW * frameAspect >= natH * frameAspect) ? 1 : natW / (natH * frameAspect);
    const fillW = natW; // we work in original pixels, apply the conceptual frame
    const fillH = natH;

    // The "frame" in original image coordinates:
    // frame covers the area visible when the image is auto-filled to the crop ratio
    // frameW_orig = natW / fillScale_conceptual... let's compute directly:
    // At display: the image is scaled so fillScale * natW = frameW_display (or frameH)
    // In original coords, the frame size is: frameW_orig = frameW_display / displayScale
    // where displayScale = fillScale * zoom
    // But we only care about the normalized crop rectangle:

    const { zoom = 1, offsetX = 0, offsetY = 0, rotation = 0 } = cropData;

    // Frame size in original image pixels
    // The concept: at zoom=1 the image is auto-filled into the frame
    // frameH_px = natH if natAspect > frameAspect, else natW / frameAspect... simplified:
    const natAspect = natW / natH;
    let frameW_px, frameH_px;
    if (natAspect > frameAspect) {
      // image is wider than frame → constrained by height
      frameH_px = natH / zoom;
      frameW_px = frameH_px * frameAspect;
    } else {
      // image is taller than frame → constrained by width
      frameW_px = natW / zoom;
      frameH_px = frameW_px / frameAspect;
    }

    // Center offset in original pixels (offsetX/Y from client are in display px, need to normalize)
    // offsetX/Y are in "display pixels" at fillScale. In original pixels: orig_off = display_off / fillScale
    // fillScale = max(frameW_display/natW, frameH_display/natH) — we don't have display size here
    // Use the known relationship: offsetX normalized to image fraction
    // For simplicity, treat offsetX/Y as fractions of the original image dimension * -1
    // Client should send normalized offsets (offsetX as fraction of natW, offsetY as fraction of natH)
    const centerX = natW / 2 - (offsetX * natW);
    const centerY = natH / 2 - (offsetY * natH);

    const cropX = Math.max(0, Math.round(centerX - frameW_px / 2));
    const cropY = Math.max(0, Math.round(centerY - frameH_px / 2));
    const cropW = Math.min(natW - cropX, Math.round(frameW_px));
    const cropH = Math.min(natH - cropY, Math.round(frameH_px));

    const outDims = OUTPUT_DIMS[aspectRatio] ?? { width: 1080, height: Math.round(1080 / frameAspect) };

    // Crop and resize
    let pipeline = img.rotate(rotation !== 0 ? rotation : undefined)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .resize(outDims.width, outDims.height, { fit: "fill" });

    const outBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
    const variantKey = `variants/${assetId}/${platform}-${format}-${randomBytes(4).toString("hex")}.jpg`;
    const variantUrl = await uploadToR2(outBuffer, variantKey, "image/jpeg");

    // Upsert the MediaVariant
    const variant = await prisma.mediaVariant.upsert({
      where: { assetId_platform_format: { assetId, platform, format } },
      update: { url: variantUrl, aspectRatio, cropData },
      create: { assetId, platform, format, aspectRatio, url: variantUrl, cropData },
    });

    res.json({ variantId: variant.id, url: variantUrl });
  } catch (err) {
    console.error("[Media crop]", err.message);
    next(err);
  }
});

// POST /api/media/process-video — crop/trim a video asset to a target ratio
// Body: { assetId, platform, format, aspectRatio, cropData: { zoom, offsetX, offsetY }, trimStart?, trimEnd? }
router.post("/process-video", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  const tmpIn  = join(tmpdir(), `vid-in-${randomBytes(8).toString("hex")}.mp4`);
  const tmpOut = join(tmpdir(), `vid-out-${randomBytes(8).toString("hex")}.mp4`);

  try {
    const { assetId, platform, format, aspectRatio, cropData = {}, trimStart, trimEnd } = req.body;
    if (!assetId || !platform || !format || !aspectRatio) {
      return res.status(400).json({ error: "assetId, platform, format, and aspectRatio are required" });
    }

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    if (asset.type !== "VIDEO") return res.status(400).json({ error: "Use /crop for image assets" });

    const srcUrl = asset.originalUrl ?? asset.url;
    const response = await axios.get(srcUrl, { responseType: "arraybuffer" });
    await writeFile(tmpIn, Buffer.from(response.data));

    const { zoom = 1, offsetX = 0, offsetY = 0 } = cropData;
    const [rw, rh] = aspectRatio.split(":").map(Number);
    const frameAspect = rw / rh;
    const outDims = OUTPUT_DIMS[aspectRatio] ?? { width: 1080, height: Math.round(1080 / frameAspect) };

    // Build FFmpeg filter: crop then scale
    // Use ffprobe to get natural dimensions
    const { natW, natH } = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tmpIn, (err, data) => {
        if (err) return reject(err);
        const vs = data.streams.find((s) => s.codec_type === "video");
        resolve({ natW: vs?.width ?? 1920, natH: vs?.height ?? 1080 });
      });
    });

    const natAspect = natW / natH;
    let frameW_px, frameH_px;
    if (natAspect > frameAspect) {
      frameH_px = natH / zoom;
      frameW_px = frameH_px * frameAspect;
    } else {
      frameW_px = natW / zoom;
      frameH_px = frameW_px / frameAspect;
    }

    const centerX = natW / 2 - (offsetX * natW);
    const centerY = natH / 2 - (offsetY * natH);
    const cropX = Math.max(0, Math.round(centerX - frameW_px / 2));
    const cropY = Math.max(0, Math.round(centerY - frameH_px / 2));
    const cropW = Math.min(natW - cropX, Math.round(frameW_px));
    const cropH = Math.min(natH - cropY, Math.round(frameH_px));

    const vfFilter = `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${outDims.width}:${outDims.height}`;

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(tmpIn).videoCodec("libx264").audioCodec("aac")
        .outputOptions(["-preset fast", "-crf 23", "-movflags +faststart"])
        .videoFilters(vfFilter);

      if (trimStart != null) cmd = cmd.setStartTime(trimStart);
      if (trimEnd   != null) cmd = cmd.setDuration(trimEnd - (trimStart ?? 0));

      cmd.output(tmpOut).on("end", resolve).on("error", reject).run();
    });

    const outBuffer = await readFile(tmpOut);
    const variantKey = `variants/${assetId}/${platform}-${format}-${randomBytes(4).toString("hex")}.mp4`;
    const variantUrl = await uploadToR2(outBuffer, variantKey, "video/mp4");

    const variant = await prisma.mediaVariant.upsert({
      where: { assetId_platform_format: { assetId, platform, format } },
      update: { url: variantUrl, aspectRatio, cropData, trimStart: trimStart ?? null, trimEnd: trimEnd ?? null },
      create: { assetId, platform, format, aspectRatio, url: variantUrl, cropData, trimStart: trimStart ?? null, trimEnd: trimEnd ?? null },
    });

    res.json({ variantId: variant.id, url: variantUrl });
  } catch (err) {
    console.error("[Video process]", err.message);
    next(err);
  } finally {
    await rm(tmpIn, { force: true });
    await rm(tmpOut, { force: true });
  }
});

// GET /api/media/:assetId/variants — get all variants for an asset
router.get("/:assetId/variants", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const variants = await prisma.mediaVariant.findMany({
      where: { assetId: req.params.assetId },
    });
    res.json({ variants });
  } catch (err) {
    next(err);
  }
});

// GET /api/media/unsplash/search?q=keyword — proxy Unsplash photo search
router.get("/unsplash/search", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    if (!process.env.UNSPLASH_ACCESS_KEY) return res.status(503).json({ error: "Unsplash not configured" });
    const q = req.query.q?.trim() || "church worship nature";
    const { data } = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query: q, per_page: 20, orientation: "squarish" },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
      timeout: 10000,
    });
    res.json({
      photos: (data.results ?? []).map((p) => ({
        id: p.id,
        thumb: p.urls.thumb,
        regular: p.urls.regular,
        photographer: p.user.name,
        photographerUrl: p.user.links.html,
        downloadLocation: p.links.download_location,
        color: p.color,
        alt: p.alt_description,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/media/unsplash/track — trigger Unsplash download event (required by API guidelines)
router.post("/unsplash/track", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res) => {
  try {
    const { downloadLocation } = req.body;
    if (!downloadLocation || !process.env.UNSPLASH_ACCESS_KEY) return res.json({ ok: true });
    await axios.get(downloadLocation, {
      params: { client_id: process.env.UNSPLASH_ACCESS_KEY },
      timeout: 5000,
    });
  } catch { /* non-critical — never fail the request over tracking */ }
  res.json({ ok: true });
});

export default router;
