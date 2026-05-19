import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const pcSyncQueue = new Queue("pc-sync", { connection });
export const publishQueue = new Queue("publish", { connection });

export { connection as redisConnection };

export function createWorker(processor) {
  return new Worker("pc-sync", processor, { connection });
}

export function createPublishWorker(processor) {
  return new Worker("publish", processor, { connection });
}
