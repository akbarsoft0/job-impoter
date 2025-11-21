# System Architecture

## Overview

The Scalable Job Import System is designed to handle large-scale job data imports from multiple XML/RSS feeds with high throughput, reliability, and monitoring capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Admin UI (Vercel)                     │
│                    Next.js 14 App Router                     │
│              /imports, /imports/[id] pages                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Render/Railway)               │
│                    Express.js + TypeScript                   │
│                                                              │
│  POST /api/import/start                                      │
│  GET  /api/import/logs                                       │
│  GET  /api/import/logs/:id                                   │
└───────┬──────────────────────────────────────┬──────────────┘
        │                                      │
        │                                      │
        ▼                                      ▼
┌──────────────┐                     ┌──────────────────┐
│  Upstash     │                     │   MongoDB Atlas  │
│  Redis       │                     │                  │
│  (BullMQ)    │                     │  - jobs          │
│              │                     │  - import_logs   │
│  Queue:      │                     │  - raw_feeds     │
│  job-import  │                     │                  │
└──────┬───────┘                     └──────────────────┘
       │
       │ Jobs
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Worker Process (Render/Railway)                 │
│              Separate Persistent Process                     │
│                                                              │
│  - Processes job batches                                     │
│  - Bulk upserts to MongoDB                                   │
│  - Updates import logs                                       │
│  - Retry logic with exponential backoff                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Cron Scheduler                            │
│            (GitHub Actions / Render Cron)                    │
│                                                              │
│  - Hourly feed fetch                                         │
│  - Enqueue jobs                                              │
│  - Create import logs                                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js 14)

**Location**: `/client`

**Deployment**: Vercel

**Key Features**:
- Server-side rendering with App Router
- Real-time import log display
- Pagination support
- Failed job details view
- Manual import trigger

**Pages**:
- `/` - Home page
- `/imports` - Import log list with pagination
- `/imports/[id]` - Detailed import log view with failed jobs

### 2. Backend API (Express.js)

**Location**: `/server`

**Deployment**: Render or Railway

**Responsibilities**:
- Feed fetching and parsing (XML → JSON)
- Job queue management
- Import log creation and retrieval
- API endpoint handling

**Key Endpoints**:
- `POST /api/import/start` - Start new import
- `GET /api/import/logs` - List import logs (paginated)
- `GET /api/import/logs/:id` - Get import log details

### 3. Queue System (BullMQ + Upstash Redis)

**Technology**: BullMQ with Upstash Redis (serverless)

**Why Upstash**:
- Serverless Redis compatible with Vercel
- Works seamlessly with Render/Railway workers
- Auto-scaling capabilities
- Low latency

**Queue Configuration**:
- Queue name: `job-import-queue`
- Job attempts: 3
- Backoff: Exponential (2s, 4s, 8s)
- Job cleanup: 24 hours (completed), 7 days (failed)

**Job Structure**:
```typescript
{
  feedUrl: string;
  importLogId: string;
  jobs: Job[];
}
```

### 4. Worker Process

**Location**: `/server/src/worker.ts`

**Deployment**: Render Background Worker or Railway Service (separate from API)

**Critical**: Workers MUST run as separate persistent processes. They cannot run on Vercel.

**Responsibilities**:
- Process job batches from queue
- Bulk upsert jobs to MongoDB
- Update import log statistics
- Handle retries and failures
- Track completion status

**Configuration**:
- Concurrency: Configurable (default: 10)
- Batch size: Configurable (default: 200)

**Error Handling**:
- Failed jobs logged to import_logs
- Exponential backoff retry
- Job failure tracking

### 5. Database (MongoDB Atlas)

**Collections**:

#### `jobs`
```typescript
{
  _id: ObjectId;
  externalId: string;        // Unique: feedUrl::guid
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
```

**Indexes**:
- `{ externalId: 1, feedUrl: 1 }` - Unique (prevents duplicates)
- `{ feedUrl: 1 }` - For filtering by feed
- `{ createdAt: -1 }` - For sorting
- `{ updatedAt: -1 }` - For sorting

#### `import_logs`
```typescript
{
  _id: ObjectId;
  timestamp: Date;
  fileName: string;          // Feed URL
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
```

**Indexes**:
- `{ timestamp: -1 }` - For sorting recent imports
- `{ fileName: 1 }` - For filtering by feed

#### `raw_feeds` (Temporary)
```typescript
{
  _id: ObjectId;
  feedUrl: string;
  data: any;                 // Raw parsed data
  fetchedAt: Date;
}
```

**Cleanup**: Automatic cleanup of feeds older than 7 days

### 6. Cron Scheduler

**Options**:
1. **GitHub Actions** (Recommended)
   - Scheduled workflow every hour
   - Makes HTTP request to backend API
   - No additional infrastructure needed

2. **Render Cron**
   - Separate cron job service
   - Runs `node dist/cron.js`
   - Direct database/queue access

**Flow**:
1. Fetch all feeds from `FEEDS_JSON`
2. Parse each feed (XML → JSON)
3. Create import_log entry
4. Enqueue jobs in batches
5. Update import_log status to 'processing'

## Data Flow

### Import Flow

```
1. Cron triggers /api/import/start OR user clicks "Start Import"
   ↓
2. Backend fetches XML feed
   ↓
3. Backend parses XML → JSON
   ↓
4. Backend creates import_log (status: 'pending')
   ↓
5. Backend saves raw feed to MongoDB
   ↓
6. Backend splits jobs into batches (BATCH_SIZE)
   ↓
7. Backend enqueues batches to Redis queue
   ↓
8. Backend updates import_log (status: 'processing')
   ↓
9. Worker picks up batches from queue
   ↓
10. Worker bulk upserts jobs to MongoDB
    ↓
11. Worker updates import_log with statistics
    ↓
12. Worker checks if all batches complete
    ↓
13. Worker updates import_log (status: 'completed' or 'failed')
```

### Query Flow

```
1. User visits /imports page
   ↓
2. Frontend calls GET /api/import/logs
   ↓
3. Backend queries MongoDB import_logs collection
   ↓
4. Backend returns paginated results
   ↓
5. Frontend displays import logs table
```

## Scaling Strategy for 1M+ Jobs

### Current Capacity

**Per Batch**:
- Default: 200 jobs per batch
- Processed concurrently by worker

**Worker Concurrency**:
- Default: 10 concurrent batches
- Throughput: ~2000 jobs per batch cycle

**Estimated Time for 1M Jobs**:
- 5000 batches (1M / 200)
- At 10 concurrent workers: ~500 batch cycles
- At 30s per batch: ~4.2 hours

### Scaling Approaches

#### 1. Horizontal Scaling (Workers)

**Increase Worker Instances**:
- Deploy multiple worker processes
- Each worker pulls from the same queue
- BullMQ handles job distribution

**Configuration**:
```env
WORKER_CONCURRENCY=20  # Per worker
```

**Deploy multiple worker services** on Render/Railway:
- worker-1
- worker-2
- worker-3
- ...

**Result**: Linear scaling (3 workers × 20 concurrency = 60 concurrent batches)

#### 2. Increase Batch Size

**Configuration**:
```env
BATCH_SIZE=500  # Instead of 200
```

**Trade-offs**:
- ✅ Fewer batches to process
- ✅ Fewer MongoDB operations
- ❌ Longer processing time per batch
- ❌ More memory usage

#### 3. Increase Worker Concurrency

**Configuration**:
```env
WORKER_CONCURRENCY=50  # Instead of 10
```

**Trade-offs**:
- ✅ More concurrent processing
- ✅ Better resource utilization
- ❌ Higher MongoDB connection load
- ❌ More memory usage

#### 4. MongoDB Optimization

**Sharding**:
- Shard `jobs` collection by `feedUrl` or date range
- Distribute load across multiple shards

**Read Replicas**:
- Use read replicas for query operations
- Primary for write operations

**Connection Pooling**:
- Tune MongoDB connection pool size
- Match worker concurrency

#### 5. Redis Optimization

**Redis Cluster**:
- For very high throughput, use Redis Cluster
- Upstash supports clustering at higher tiers

**Queue Separation**:
- Separate queues per feed type
- Different processing priorities

### Recommended Scaling Path

1. **1K - 10K jobs**: Current setup (1 worker, 10 concurrency)
2. **10K - 100K jobs**: Increase concurrency to 20
3. **100K - 500K jobs**: Add 2-3 worker instances
4. **500K - 1M jobs**: 5+ workers, 30+ concurrency each
5. **1M+ jobs**: Add MongoDB sharding, Redis cluster, optimize batch sizes

### Performance Monitoring

**Key Metrics**:
- Queue length (waiting jobs)
- Processing time per batch
- Worker utilization
- MongoDB write throughput
- Failed job rate

**Tools**:
- BullMQ dashboard for queue monitoring
- MongoDB Atlas monitoring
- Render/Railway metrics
- Custom logging in import_logs

## Failure Handling

### Feed Fetch Failures

**Scenario**: XML feed is unavailable or returns error

**Handling**:
- HTTP error caught in `fetchFeed()`
- Exception thrown, import log status set to 'failed'
- Error message stored in `import_log.error`
- No jobs enqueued

**Recovery**:
- Retry manually via admin UI
- Cron will retry on next schedule

### XML Parse Failures

**Scenario**: Invalid XML format or unexpected structure

**Handling**:
- Parse errors caught per item
- Individual items skipped, error logged
- Valid items still processed
- Failed items tracked in import_log.failedJobs

### Queue Failures

**Scenario**: Redis connection lost or queue unavailable

**Handling**:
- BullMQ retries with exponential backoff
- Jobs remain in queue until processed
- Worker reconnects automatically

### MongoDB Failures

**Scenario**: Database connection lost or write errors

**Handling**:
- Bulk write errors caught in worker
- Failed jobs tracked in import_log.failedJobs
- Partial batches may succeed
- Retry mechanism via BullMQ

### Worker Crashes

**Scenario**: Worker process dies mid-processing

**Handling**:
- BullMQ marks job as failed
- Job retried on next worker (if attempts remaining)
- Import log status updated accordingly
- No data loss (jobs remain in queue)

## Indexing Strategy

### Jobs Collection

**Primary Index**: `{ externalId: 1, feedUrl: 1 }` (Unique)
- Prevents duplicate jobs
- Fast lookups for upserts

**Secondary Indexes**:
- `{ feedUrl: 1 }` - Filter jobs by feed source
- `{ createdAt: -1 }` - Sort by creation date
- `{ updatedAt: -1 }` - Sort by last update

**Optional Indexes** (based on query patterns):
- `{ category: 1 }` - If filtering by category
- `{ jobType: 1 }` - If filtering by job type
- `{ company: 1 }` - If searching by company

### Import Logs Collection

**Primary Index**: `{ timestamp: -1 }`
- Fast retrieval of recent imports
- Used for pagination

**Secondary Index**: `{ fileName: 1 }`
- Filter by feed URL
- Case-insensitive regex searches

## Worker Autoscaling Plan

### Manual Scaling (Current)

**Render/Railway Manual Scaling**:
1. Monitor queue length in BullMQ dashboard
2. If queue > 1000 jobs, add worker instance
3. If queue < 100, remove worker instance

### Automatic Scaling (Future)

**Option 1: Custom Autoscaler**

Create a monitoring service that:
- Polls BullMQ queue length
- Scales workers up/down via Render/Railway API
- Scales based on queue depth threshold

**Option 2: Kubernetes (Advanced)**

Deploy on Kubernetes with:
- Horizontal Pod Autoscaler (HPA)
- Custom metrics from BullMQ
- Auto-scale based on queue length

**Thresholds**:
- Scale up: Queue length > 500 jobs per worker
- Scale down: Queue length < 100 jobs per worker
- Cooldown: 5 minutes between scale events

## Security Considerations

1. **API Authentication**: Add JWT/auth for production
2. **CORS**: Configure allowed origins
3. **Rate Limiting**: Implement rate limits on API endpoints
4. **Environment Variables**: Never commit secrets
5. **MongoDB**: Use connection string with IP whitelist
6. **Redis**: Use authentication and TLS

## Cost Optimization

1. **Upstash Redis**: Free tier sufficient for moderate usage
2. **MongoDB Atlas**: M0 free tier for development, scale as needed
3. **Render/Railway**: Free tiers available, pay per usage
4. **Worker Scaling**: Scale down during low traffic periods
5. **Data Cleanup**: Automatic cleanup of old raw_feeds

## Future Enhancements

1. **Real-time Progress**: WebSocket/SSE for live import updates
2. **Job Deduplication**: Enhanced duplicate detection
3. **Feed Validation**: Pre-import feed health checks
4. **Analytics Dashboard**: Job statistics and trends
5. **Export Functionality**: Export jobs to CSV/JSON
6. **Multi-tenancy**: Support for multiple organizations
