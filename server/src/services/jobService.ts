import { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { Job, ImportLog } from '../types';
import { connectDatabase } from '../config/database';

export interface BulkUpsertResult {
  newJobs: number;
  updatedJobs: number;
  failedJobs: Array<{ id: string; reason: string }>;
}

export async function bulkUpsertJobs(jobs: Job[]): Promise<BulkUpsertResult> {
  const db = await connectDatabase();
  const jobsCollection = db.collection<Job>('jobs');

  const now = new Date();
  const operations: AnyBulkWriteOperation<Job>[] = [];

  const failedJobs: Array<{ id: string; reason: string }> = [];
  let newJobs = 0;
  let updatedJobs = 0;

  for (const job of jobs) {
    try {
      // Ensure timestamps
      if (!job.createdAt) {
        job.createdAt = now;
      }
      job.updatedAt = now;

      operations.push({
        updateOne: {
          filter: { externalId: job.externalId, feedUrl: job.feedUrl },
          update: {
            $set: job,
            $setOnInsert: { createdAt: job.createdAt },
          },
          upsert: true,
        },
      });
    } catch (error) {
      failedJobs.push({
        id: job.externalId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (operations.length > 0) {
    try {
      const result = await jobsCollection.bulkWrite(operations, { ordered: false });

      // Calculate new vs updated
      // upsertedCount = documents that didn't exist (new jobs)
      // modifiedCount = documents that existed and were updated
      newJobs = result.upsertedCount || 0;
      updatedJobs = result.modifiedCount || 0;
    } catch (error) {
      // Handle bulk write errors
      console.error('Bulk write error:', error);
      throw error;
    }
  }

  return {
    newJobs,
    updatedJobs,
    failedJobs,
  };
}

export async function saveRawFeed(feedUrl: string, data: any): Promise<void> {
  const db = await connectDatabase();
  const rawFeedsCollection = db.collection('raw_feeds');

  await rawFeedsCollection.insertOne({
    feedUrl,
    data,
    fetchedAt: new Date(),
  });

  // Cleanup old raw feeds (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await rawFeedsCollection.deleteMany({
    fetchedAt: { $lt: sevenDaysAgo },
  });
}

export async function createImportLog(
  fileName: string,
  totalFetched: number
): Promise<string> {
  const db = await connectDatabase();
  const importLogsCollection = db.collection<ImportLog>('import_logs');

  const log: Omit<ImportLog, '_id'> = {
    timestamp: new Date(),
    fileName,
    totalFetched,
    totalImported: 0,
    newJobs: 0,
    updatedJobs: 0,
    failedJobs: [],
    status: 'pending',
  };

  const result = await importLogsCollection.insertOne(log);
  return result.insertedId.toString();
}

export async function updateImportLog(
  logId: string,
  updates: any
): Promise<void> {
  const db = await connectDatabase();
  const importLogsCollection = db.collection<ImportLog>('import_logs');

  const updateQuery: any = {};
  
  // Handle $inc, $push, $set operations
  if (updates.$inc || updates.$push || updates.$set) {
    Object.assign(updateQuery, updates);
  } else {
    updateQuery.$set = updates;
  }

  const _id = new ObjectId(logId);
  await importLogsCollection.updateOne(
    { _id } as any,
    updateQuery
  );
}

export async function getImportLogs(
  page: number = 1,
  limit: number = 20,
  fileName?: string
): Promise<{ logs: ImportLog[]; total: number }> {
  const db = await connectDatabase();
  const importLogsCollection = db.collection<ImportLog>('import_logs');

  const query: any = {};
  if (fileName) {
    query.fileName = { $regex: fileName, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    importLogsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    importLogsCollection.countDocuments(query),
  ]);

  return { logs, total };
}

export async function getImportLogById(logId: string): Promise<ImportLog | null> {
  const db = await connectDatabase();
  const importLogsCollection = db.collection<ImportLog>('import_logs');

  let log: ImportLog | null;
  try {
    const _id = new ObjectId(logId);
    log = await importLogsCollection.findOne({ _id } as any);
  } catch (error) {
    // Invalid ObjectId format
    log = null;
  }
  return log;
}
