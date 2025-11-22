import "dotenv/config";
import { fetchAndParseFeed } from "./feedParser";
import { createImportLog, updateImportLog, saveRawFeed } from "./jobService";
import { getQueue } from "../config/redis";
import { Job } from "../types";

export async function processAllFeeds() {
  const feedsJson = process.env.FEEDS_JSON;

  console.log("feedsJson::", feedsJson);

  if (!feedsJson) {
    throw new Error("FEEDS_JSON environment variable is not set");
  }

  const feeds: string[] = JSON.parse(feedsJson);
  const batchSize = parseInt(process.env.BATCH_SIZE || "200", 10);

  console.log(`Processing ${feeds.length} feeds...`);

  for (const feedUrl of feeds) {
    try {
      console.log(`Processing feed: ${feedUrl}`);

      // Fetch and parse feed
      const parsedJobs = await fetchAndParseFeed(feedUrl);

      // Save raw feed data
      try {
        await saveRawFeed(feedUrl, parsedJobs);
      } catch (error) {
        console.error("Failed to save raw feed:", error);
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
      const queue = getQueue();

      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);

        await queue.add(
          "process-job-batch",
          {
            feedUrl,
            importLogId,
            jobs: batch,
          },
          {
            jobId: `${importLogId}-${i / batchSize}`,
          }
        );
      }

      // Update import log status
      await updateImportLog(importLogId, { status: "processing" });

      console.log(
        `Enqueued ${jobs.length} jobs in ${Math.ceil(
          jobs.length / batchSize
        )} batches for feed: ${feedUrl}`
      );
    } catch (error) {
      console.error(`Error processing feed ${feedUrl}:`, error);
      // Continue with next feed
    }
  }

  console.log("All feeds processed");
}
