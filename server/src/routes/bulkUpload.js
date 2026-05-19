import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { requireOrgRole } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const VALID_PLATFORMS = ["facebook", "instagram", "youtube", "tiktok"];
const VALID_STATUSES = ["DRAFT", "SCHEDULED"];

function parseRow(raw, index) {
  const errors = [];
  const rowNum = index + 2; // 1-based + header row

  // Platforms
  const platformRaw = (raw.platforms || raw.platform || "").toLowerCase().trim();
  const platforms = platformRaw
    .split(/[|,;]+/)
    .map((p) => p.trim())
    .filter((p) => VALID_PLATFORMS.includes(p));
  if (!platforms.length) errors.push("No valid platforms (use: facebook, instagram, youtube, tiktok)");

  // Captions — per-platform overrides, falling back to shared caption
  const sharedCaption = (raw.caption || "").trim();
  const captions = {};
  for (const p of VALID_PLATFORMS) {
    const key = `${p}_caption`;
    const override = (raw[key] || "").trim();
    if (override) captions[p] = override;
    else if (sharedCaption && platforms.includes(p)) captions[p] = sharedCaption;
  }

  const hasAnyCaption = platforms.some((p) => captions[p]?.trim());
  if (!hasAnyCaption) errors.push("caption is required");

  // Schedule date
  let scheduledAt = null;
  const dateRaw = (raw.scheduled_at || raw.scheduledAt || raw.date || "").trim();
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) {
      errors.push(`Invalid date: "${dateRaw}". Use ISO format: 2026-05-25 10:00`);
    } else {
      scheduledAt = d.toISOString();
    }
  }

  // Status
  const statusRaw = (raw.status || "").toUpperCase().trim();
  let status = statusRaw && VALID_STATUSES.includes(statusRaw) ? statusRaw : null;
  if (!status) status = scheduledAt ? "SCHEDULED" : "DRAFT";

  return {
    rowNum,
    title: (raw.title || "").trim() || null,
    captions,
    platforms,
    status,
    scheduledAt,
    errors,
    valid: errors.length === 0,
  };
}

// POST /api/bulk-upload/preview — parse CSV and return validated rows (no DB write)
router.post(
  "/preview",
  requireOrgRole("ORG_ADMIN", "EDITOR"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let records;
    try {
      records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      return res.status(400).json({ error: `CSV parse error: ${err.message}` });
    }

    if (!records.length) return res.status(400).json({ error: "CSV file is empty" });
    if (records.length > 500) return res.status(400).json({ error: "Max 500 rows per upload" });

    const rows = records.map((raw, i) => parseRow(raw, i));
    const validCount = rows.filter((r) => r.valid).length;
    const errorCount = rows.filter((r) => !r.valid).length;

    res.json({ rows, validCount, errorCount, total: rows.length });
  }
);

// POST /api/bulk-upload/commit — create posts for all valid rows
router.post("/commit", requireOrgRole("ORG_ADMIN", "EDITOR"), async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: "No rows provided" });
    }

    const validRows = rows.filter((r) => r.valid);
    if (!validRows.length) return res.status(400).json({ error: "No valid rows to commit" });

    // Create a BulkUploadJob record
    const job = await prisma.bulkUploadJob.create({
      data: {
        organizationId: req.org.id,
        uploadedBy: req.orgUser.clerkId,
        filename: req.body.filename || "upload.csv",
        status: "processing",
        totalRows: validRows.length,
        processedRows: 0,
      },
    });

    // Create all posts
    const created = await Promise.all(
      validRows.map((row) =>
        prisma.post.create({
          data: {
            organizationId: req.org.id,
            authorId: req.orgUser.id,
            title: row.title || null,
            captions: row.captions,
            platforms: row.platforms,
            status: row.status,
            scheduledAt: row.scheduledAt ? new Date(row.scheduledAt) : null,
          },
        })
      )
    );

    // Update job to complete
    await prisma.bulkUploadJob.update({
      where: { id: job.id },
      data: { status: "complete", processedRows: created.length },
    });

    res.json({ success: true, created: created.length, jobId: job.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/bulk-upload/jobs — list past bulk upload jobs
router.get("/jobs", async (req, res, next) => {
  try {
    const jobs = await prisma.bulkUploadJob.findMany({
      where: { organizationId: req.org.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

export default router;
