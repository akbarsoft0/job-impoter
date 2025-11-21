import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();

  // Create indexes
  await createIndexes(db);

  return db;
}

async function createIndexes(db: Db) {
  const jobsCollection = db.collection('jobs');
  
  // Unique index on externalId + feedUrl to prevent duplicates
  await jobsCollection.createIndex(
    { externalId: 1, feedUrl: 1 },
    { unique: true }
  );

  // Index for queries
  await jobsCollection.createIndex({ feedUrl: 1 });
  await jobsCollection.createIndex({ createdAt: -1 });
  await jobsCollection.createIndex({ updatedAt: -1 });

  const importLogsCollection = db.collection('import_logs');
  await importLogsCollection.createIndex({ timestamp: -1 });
  await importLogsCollection.createIndex({ fileName: 1 });
}

export async function disconnectDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}
