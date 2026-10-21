import { createPublishWorker, publishQueue } from "../lib/redis.js";
import { publishPost } from "../services/publisher.js";
import { enqueuePostMetricsSync } from "./analyticsWorker.js";
import prisma from "../lib/prisma.js";

// The sweep is only a safety net for timers lost to a Redis flush — each run wakes the
// Neon compute, so keep it infrequent or the database never auto-suspends.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function scheduledJobId(postId, scheduledAt) {
  return `publish-${postId}-${scheduledAt.getTime()}`;
}

export async function enqueueScheduledPost(post) {
  if (post.status !== "SCHEDULED" || !post.scheduledAt) return;
  const scheduledAt = new Date(post.scheduledAt);
  try {
    // jobId is keyed on the scheduled time, so re-enqueueing the same slot is a no-op
    await publishQueue.add("publish", { postId: post.id, scheduledAt: scheduledAt.getTime() }, {
      jobId: scheduledJobId(post.id, scheduledAt),
      delay: Math.max(0, scheduledAt.getTime() - Date.now()),
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
    });
  } catch (err) {
    console.error(`[Publish Scheduler] Failed to enqueue post ${post.id}:`, err.message);
  }
}

export async function cancelScheduledPost(post) {
  if (!post.scheduledAt) return;
  try {
    const job = await publishQueue.getJob(scheduledJobId(post.id, new Date(post.scheduledAt)));
    if (job && (await job.isDelayed())) await job.remove();
  } catch (err) {
    console.warn(`[Publish Scheduler] Failed to cancel job for post ${post.id}:`, err.message);
  }
}

export function startPublishWorker() {
  const worker = createPublishWorker(async (job) => {
    const { postId, scheduledAt } = job.data;

    // A timer can outlive an edit (reschedule, unschedule, publish-now) if cancelling it
    // failed — only fire if the post is still scheduled for exactly this slot.
    if (scheduledAt) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { status: true, scheduledAt: true },
      });
      if (post?.status !== "SCHEDULED" || post.scheduledAt?.getTime() !== scheduledAt) {
        return { skipped: true };
      }
    }

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

// Posts get a delayed job when saved; this sweep re-creates any timers that went missing
export function startPublishScheduler() {
  async function sweep() {
    try {
      const scheduled = await prisma.post.findMany({
        where: { status: "SCHEDULED", scheduledAt: { not: null } },
        select: { id: true, status: true, scheduledAt: true },
      });
      for (const post of scheduled) await enqueueScheduledPost(post);
    } catch (err) {
      console.error("[Publish Scheduler] Sweep failed:", err.message);
    }
  }

  sweep();
  return setInterval(sweep, SWEEP_INTERVAL_MS);
}
