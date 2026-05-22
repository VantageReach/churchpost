import { createAnalyticsWorker, analyticsQueue } from "../lib/redis.js";
import { syncPostMetrics, syncOrgAnalytics } from "../services/analyticsFetcher.js";

const worker = createAnalyticsWorker(async (job) => {
  const { type, organizationId, postId } = job.data;

  if (type === "sync-post") {
    await syncPostMetrics(postId);
  } else if (type === "sync-org") {
    await syncOrgAnalytics(organizationId);
  }
});

worker.on("failed", (job, err) => {
  console.error(`[analyticsWorker] job ${job?.id} failed:`, err.message);
});

export function startAnalyticsWorker() {
  console.log("[analyticsWorker] started");
  return worker;
}

// Enqueue a full org sync for a given org — deduped by jobId
export async function enqueueOrgAnalyticsSync(organizationId) {
  await analyticsQueue.add(
    "sync-org",
    { type: "sync-org", organizationId },
    {
      jobId: `sync-org-${organizationId}`,
      removeOnComplete: 20,
      removeOnFail: 10,
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
    }
  );
}

// Enqueue a single-post metric refresh, e.g. triggered 1h after publish
export async function enqueuePostMetricsSync(postId, delayMs = 0) {
  await analyticsQueue.add(
    "sync-post",
    { type: "sync-post", postId },
    {
      jobId: `sync-post-${postId}`,
      delay: delayMs,
      removeOnComplete: 20,
      removeOnFail: 10,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}
