import { Redis } from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

let redisClient: Redis | null = null;
let queue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  // Parse Redis URL (Upstash format)
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  return redisClient;
}

export function getQueue(): Queue {
  if (queue) {
    return queue;
  }

  const prefix = process.env.BULLMQ_PREFIX || 'job_import';
  const redisClient = getRedisClient();

  queue = new Queue('job-import-queue', {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  return queue;
}

export function getQueueEvents(): QueueEvents {
  if (queueEvents) {
    return queueEvents;
  }

  const redisClient = getRedisClient();
  queueEvents = new QueueEvents('job-import-queue', {
    connection: redisClient,
  });

  return queueEvents;
}

export async function closeRedis() {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
