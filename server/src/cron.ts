import 'dotenv/config';
import { connectDatabase } from './config/database';
import { processAllFeeds } from './services/cronService';

async function main() {
  console.log('Starting cron job...');

  try {
    // Connect to database
    await connectDatabase();
    console.log('Connected to MongoDB');

    // Process all feeds
    await processAllFeeds();

    console.log('Cron job completed');
    process.exit(0);
  } catch (error) {
    console.error('Cron job error:', error);
    process.exit(1);
  }
}

main();
