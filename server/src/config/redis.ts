// redis.ts
import Redis from "ioredis";
import { Queue, QueueEvents } from "bullmq";

let redisClient: Redis | null = null;
let queue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  // Upstash Redis requires TLS + disables readyCheck + maxRetriesPerRequest
  redisClient = new Redis(redisUrl, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 50, 2000); // Auto reconnect
    },
  });

  return redisClient;
}

export function getQueue(): Queue {
  if (queue) return queue;

  const redisUrl = process.env.REDIS_URL;

  queue = new Queue("job-import-queue", {
    connection: {
      url: redisUrl,
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  });

  return queue;
}

export function getQueueEvents(): QueueEvents {
  if (queueEvents) return queueEvents;

  const redisUrl = process.env.REDIS_URL;

  queueEvents = new QueueEvents("job-import-queue", {
    connection: {
      url: redisUrl,
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    },
  });

  return queueEvents;
}

export async function closeRedis() {
  if (queue) await queue.close();
  if (queueEvents) await queueEvents.close();
  if (redisClient) await redisClient.quit();

  queue = null;
  queueEvents = null;
  redisClient = null;
}
