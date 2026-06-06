import prisma from "../lib/prisma.js";
import { deleteFromR2, r2KeyFromUrl } from "../lib/r2.js";

const RETENTION_DAYS = 30;

async function runMediaCleanup() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  // Find media assets attached to posts that published more than 30 days ago
  const assets = await prisma.mediaAsset.findMany({
    where: {
      post: {
        status: "PUBLISHED",
        publishedAt: { lt: cutoff },
      },
      url: { not: null },
      cleanedAt: null,
    },
    select: { id: true, url: true, originalUrl: true, variants: { select: { url: true } } },
  });

  if (assets.length === 0) {
    console.log("[MediaCleanup] Nothing to clean up.");
    return;
  }

  console.log(`[MediaCleanup] Cleaning ${assets.length} asset(s) published before ${cutoff.toISOString().slice(0, 10)}`);

  let deleted = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      // Delete all R2 files associated with this asset
      const urls = [
        asset.url,
        asset.originalUrl,
        ...asset.variants.map((v) => v.url),
      ].filter(Boolean);

      for (const url of urls) {
        const key = r2KeyFromUrl(url);
        if (key) await deleteFromR2(key);
      }

      // Mark as cleaned in the database
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { cleanedAt: new Date() },
      });

      deleted++;
    } catch (err) {
      console.error(`[MediaCleanup] Failed to clean asset ${asset.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[MediaCleanup] Done — ${deleted} cleaned, ${failed} failed.`);
}

export function startMediaCleanupWorker() {
  console.log("[MediaCleanup] Scheduled — runs daily at 3 AM");

  // Run once at startup (catches any backlog), then daily at 3 AM
  setTimeout(() => runMediaCleanup().catch(console.error), 60_000);

  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() < 5) {
      runMediaCleanup().catch(console.error);
    }
  }, 5 * 60 * 1000); // check every 5 minutes
}
