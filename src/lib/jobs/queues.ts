import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";

const globalForQueues = globalThis as unknown as {
  redis?: IORedis;
  webhookQueue?: Queue;
  sendQueue?: Queue;
  workersStarted?: boolean;
};

export function redisConnection() {
  if (!globalForQueues.redis) {
    globalForQueues.redis = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return globalForQueues.redis;
}

export const webhookQueue =
  globalForQueues.webhookQueue ??
  new Queue("webhook-deliveries", {
    connection: redisConnection(),
  });

export const sendQueue =
  globalForQueues.sendQueue ??
  new Queue("send-jobs", {
    connection: redisConnection(),
  });

globalForQueues.webhookQueue = webhookQueue;
globalForQueues.sendQueue = sendQueue;

export function startWorkers() {
  if (globalForQueues.workersStarted) return;

  globalForQueues.workersStarted = true;

  new Worker(
    "webhook-deliveries",
    async (job) => {
      const { deliverWebhook } = await import("@/lib/webhooks");
      await deliverWebhook(job.data.deliveryId);
    },
    { connection: redisConnection(), concurrency: 5 },
  );

  new Worker(
    "send-jobs",
    async (job) => {
      const { processSendJob } = await import("@/lib/jobs/send-worker");
      await processSendJob(job.data.sendJobId);
    },
    { connection: redisConnection(), concurrency: 2 },
  );
}
