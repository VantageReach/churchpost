import { createWorker, pcSyncQueue } from "../lib/redis.js";
import { syncPlanningCenter } from "../services/planningCenterSync.js";
import prisma from "../lib/prisma.js";

export function startPcSyncWorker() {
  const worker = createWorker(async (job) => {
    const { organizationId } = job.data;
    console.log(`[PC Worker] Starting sync for org ${organizationId}`);
    await syncPlanningCenter(organizationId);

    // Schedule next recurring sync based on this org's configured frequency
    const conn = await prisma.planningCenterConnection.findUnique({
      where: { organizationId },
      select: { syncFrequencyHours: true },
    });
    if (conn) {
      const delayMs = (conn.syncFrequencyHours || 4) * 60 * 60 * 1000;
      await pcSyncQueue.add(
        "sync",
        { organizationId },
        { delay: delayMs, attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      );
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`[PC Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[PC Worker] Job ${job.id} completed`);
  });

  return worker;
}

// On startup, schedule a sync for any org that hasn't synced recently
export async function scheduleExistingOrgs() {
  const connections = await prisma.planningCenterConnection.findMany({
    where: { syncStatus: { not: "syncing" } },
    select: { organizationId: true, lastSyncedAt: true, syncFrequencyHours: true },
  });

  for (const conn of connections) {
    const freqMs = (conn.syncFrequencyHours || 4) * 60 * 60 * 1000;
    const lastSync = conn.lastSyncedAt?.getTime() ?? 0;
    const due = lastSync + freqMs;
    const delayMs = Math.max(0, due - Date.now());

    await pcSyncQueue.add(
      "sync",
      { organizationId: conn.organizationId },
      { delay: delayMs, attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );
  }

  if (connections.length > 0) {
    console.log(`[PC Worker] Scheduled syncs for ${connections.length} org(s)`);
  }
}
