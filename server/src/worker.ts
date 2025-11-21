import 'dotenv/config';
import { Worker } from 'bullmq';
import { connectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import { bulkUpsertJobs, updateImportLog } from './services/jobService';
import { QueueJobData, Job } from './types';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '10', 10);

async function main() {
  console.log('Starting worker...');
  console.log(`Concurrency: ${concurrency}`);

  // Connect to MongoDB
  await connectDatabase();
  console.log('Connected to MongoDB');

  // Create worker
  const redisClient = getRedisClient();
  const worker = new Worker<QueueJobData>(
    'job-import-queue',
    async (job) => {
      const { feedUrl, importLogId, jobs } = job.data;

      console.log(`Processing batch for import log ${importLogId}: ${jobs.length} jobs`);

      try {
        // Bulk upsert jobs
        const result = await bulkUpsertJobs(jobs as Job[]);

        // Update import log
        await updateImportLog(importLogId, {
          $inc: {
            totalImported: result.newJobs + result.updatedJobs,
            newJobs: result.newJobs,
            updatedJobs: result.updatedJobs,
          },
          $push: {
            failedJobs: { $each: result.failedJobs },
          },
        });

        console.log(`Batch completed: ${result.newJobs} new, ${result.updatedJobs} updated, ${result.failedJobs.length} failed`);

        // Check if this was the last batch and update status
        const { checkAndUpdateImportLogStatus } = await import('./services/queueService');
        await checkAndUpdateImportLogStatus(importLogId);

        return {
          success: true,
          newJobs: result.newJobs,
          updatedJobs: result.updatedJobs,
          failedJobs: result.failedJobs.length,
        };
      } catch (error) {
        console.error(`Error processing batch for import log ${importLogId}:`, error);

        // Update import log with error
        await updateImportLog(importLogId, {
          $push: {
            failedJobs: {
              $each: jobs.map((job: any) => ({
                id: job.externalId,
                reason: error instanceof Error ? error.message : 'Unknown error',
              })),
            },
          },
          $set: {
            status: 'failed',
          },
        });

        throw error;
      }
    },
    {
      connection: redisClient,
      concurrency,
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('Worker started and waiting for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
