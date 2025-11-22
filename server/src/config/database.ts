// database.ts
import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  // If already connected, return same DB instance
  if (db) return db;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set.');
  }

  console.log('Connecting to MongoDB...');

  client = new MongoClient(mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 0, // Prevents ECONNRESET in long-running workers
    retryReads: true,
    retryWrites: true,
  });

  await client.connect();

  db = client.db();
  console.log('MongoDB connected successfully.');

  // Create indexes only once in worker lifetime
  await createIndexes(db);

  return db;
}

export async function disconnectDatabase() {
  if (client) {
    await client.close();
  }
  client = null;
  db = null;
}

async function createIndexes(db: Db) {
  console.log('Ensuring database indexes...');

  const jobsCollection = db.collection('jobs');

  await jobsCollection.createIndex(
    { externalId: 1, feedUrl: 1 },
    { unique: true }
  );

  await jobsCollection.createIndex({ feedUrl: 1 });
  await jobsCollection.createIndex({ createdAt: -1 });
  await jobsCollection.createIndex({ updatedAt: -1 });

  const importLogsCollection = db.collection('import_logs');

  await importLogsCollection.createIndex({ timestamp: -1 });
  await importLogsCollection.createIndex({ fileName: 1 });

  console.log('Indexes ensured.');
}

export function getDatabaseSync(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}
