import { createWorker, pcSyncQueue } from "../lib/redis.js";
import { syncPlanningCenter } from "../services/planningCenterSync.js";
import prisma from "../lib/prisma.js";

// Every completed sync (recurring, manual, or first-connect) schedules the next one, so
// replace any pending sync for the org instead of stacking a parallel chain per restart.
async function scheduleNextSync(organizationId, delayMs) {
  const delayed = await pcSyncQueue.getDelayed();
  await Promise.all(
    delayed.filter((j) => j.data.organizationId === organizationId).map((j) => j.remove())
  );
  await pcSyncQueue.add(
    "sync",
    { organizationId },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}

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
      await scheduleNextSync(organizationId, (conn.syncFrequencyHours || 4) * 60 * 60 * 1000);
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

    await scheduleNextSync(conn.organizationId, delayMs);
  }

  if (connections.length > 0) {
    console.log(`[PC Worker] Scheduled syncs for ${connections.length} org(s)`);
  }
}
