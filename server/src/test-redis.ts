import "dotenv/config";
import { getRedisClient, getQueue } from "./config/redis";

async function main() {
  try {
    console.log(
      "Testing Redis connection using REDIS_URL =",
      process.env.REDIS_URL
    );

    const client = getRedisClient();

    // Simple ping
    const pingResult = await client.ping();
    console.log("PING result:", pingResult);

    // Check basic key set/get
    const testKey = "job-import-test-key";
    await client.set(testKey, "ok", "EX", 30);
    const value = await client.get(testKey);
    console.log("SET/GET result:", value);

    // Check BullMQ queue connectivity
    const queue = getQueue();
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );
    console.log("Queue job counts:", counts);

    console.log("\n✅ Redis connection looks OK");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Redis connection test failed:", error);
    process.exit(1);
  }
}

main();
