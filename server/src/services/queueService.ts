import { getQueue } from '../config/redis';
import { getImportLogById, updateImportLog } from './jobService';

export async function checkAndUpdateImportLogStatus(importLogId: string) {
  try {
    const log = await getImportLogById(importLogId);
    if (!log) {
      return;
    }

    // Check if all jobs are complete
    const queue = getQueue();
    const jobs = await queue.getJobs(['waiting', 'active', 'delayed'], 0, -1);
    
    const relatedJobs = jobs.filter(
      (job) => job.data.importLogId === importLogId
    );

    // Check if all batches are complete
    // This happens when:
    // 1. No jobs are waiting/active/delayed in queue for this import log
    // 2. OR total processed (imported + failed) >= total fetched
    const totalProcessed = log.totalImported + log.failedJobs.length;
    const allBatchesComplete = relatedJobs.length === 0 || totalProcessed >= log.totalFetched;
    
    if (allBatchesComplete && log.status === 'processing') {
      // Determine final status
      const allFailed = log.failedJobs.length === log.totalFetched;
      const finalStatus = allFailed ? 'failed' : 'completed';
      
      await updateImportLog(importLogId, {
        status: finalStatus,
      });
      
      console.log(`Import log ${importLogId} marked as ${finalStatus}`);
    }
  } catch (error) {
    console.error(`Error checking import log status for ${importLogId}:`, error);
  }
}
