import { createPublishWorker, publishQueue } from "../lib/redis.js";
import { publishPost } from "../services/publisher.js";
import { enqueuePostMetricsSync } from "./analyticsWorker.js";
import prisma from "../lib/prisma.js";

export function startPublishWorker() {
  const worker = createPublishWorker(async (job) => {
    const { postId } = job.data;
    await publishPost(postId);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Publish Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", async (job) => {
    console.log(`[Publish Worker] Job ${job.id} completed`);
    const { postId } = job.data;
    try {
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { status: true } });
      if (post?.status === "PUBLISHED" || post?.status === "PARTIAL") {
        // Fetch metrics 1 hour after publish (platforms need time to process)
        await enqueuePostMetricsSync(postId, 60 * 60 * 1000);
      }
    } catch (err) {
      console.warn(`[Publish Worker] Failed to enqueue analytics for ${postId}:`, err.message);
    }
  });

  return worker;
}

// Runs every 60s — finds SCHEDULED posts that are due and enqueues them
export function startPublishScheduler() {
  async function check() {
    try {
      const due = await prisma.post.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: new Date() },
        },
        select: { id: true },
      });

      for (const post of due) {
        // jobId deduplication: BullMQ won't enqueue if this ID is already waiting/active
        await publishQueue.add("publish", { postId: post.id }, {
          jobId: `publish-${post.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 10_000 },
        });
      }

      if (due.length > 0) {
        console.log(`[Publish Scheduler] Enqueued ${due.length} post(s)`);
      }
    } catch (err) {
      console.error("[Publish Scheduler] Check failed:", err.message);
    }
  }

  // Run immediately then every 60 seconds
  check();
  const interval = setInterval(check, 60_000);
  return interval;
}
