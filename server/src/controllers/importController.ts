import { Request, Response } from 'express';
import { fetchAndParseFeed, ParsedJob } from '../services/feedParser';
import { 
  createImportLog, 
  updateImportLog, 
  getImportLogs, 
  getImportLogById,
  saveRawFeed 
} from '../services/jobService';
import { getQueue } from '../config/redis';
import { Job } from '../types';

export async function startImport(req: Request, res: Response) {
  try {
    const { feedUrl } = req.body;

    if (!feedUrl) {
      return res.status(400).json({ error: 'feedUrl is required' });
    }

    // Fetch and parse feed
    const parsedJobs = await fetchAndParseFeed(feedUrl);

    // Save raw feed data
    try {
      await saveRawFeed(feedUrl, parsedJobs);
    } catch (error) {
      console.error('Failed to save raw feed:', error);
      // Continue even if raw feed save fails
    }

    // Create import log
    const importLogId = await createImportLog(feedUrl, parsedJobs.length);

    // Convert parsed jobs to Job format
    const jobs: Job[] = parsedJobs.map((parsedJob) => ({
      ...parsedJob,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Enqueue jobs in batches
    const batchSize = parseInt(process.env.BATCH_SIZE || '200', 10);
    const queue = getQueue();

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      
      await queue.add('process-job-batch', {
        feedUrl,
        importLogId,
        jobs: batch,
      }, {
        jobId: `${importLogId}-${i / batchSize}`,
      });
    }

    // Update import log status
    await updateImportLog(importLogId, { status: 'processing' });

    res.json({
      success: true,
      importLogId,
      totalFetched: parsedJobs.length,
      batchesCreated: Math.ceil(jobs.length / batchSize),
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      error: 'Failed to start import',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getLogs(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const fileName = req.query.fileName as string | undefined;

    const { logs, total } = await getImportLogs(page, limit, fileName);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch import logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getLogById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const log = await getImportLogById(id);

    if (!log) {
      return res.status(404).json({ error: 'Import log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get log by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch import log',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
