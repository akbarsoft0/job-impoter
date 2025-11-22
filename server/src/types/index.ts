export interface Job {
  _id?: string;
  externalId: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  category?: string;
  jobType?: string;
  region?: string;
  url?: string;
  feedUrl: string;
  rawData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportLog {
  _id?: string; // stored as ObjectId in Mongo, represented as string in API layer
  timestamp: Date;
  fileName: string; // feed URL
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: Array<{
    id: string;
    reason: string;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface RawFeed {
  _id?: string;
  feedUrl: string;
  data: any;
  fetchedAt: Date;
}

export interface FeedConfig {
  url: string;
  category?: string;
  jobType?: string;
  region?: string;
}

export interface QueueJobData {
  feedUrl: string;
  importLogId: string;
  jobs: Job[];
}
