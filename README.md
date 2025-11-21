# Scalable Job Import System

A production-grade job import system that fetches jobs from multiple XML/RSS feeds, processes them through a Redis queue, and stores them in MongoDB with full import history tracking.

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) deployed on Vercel
- **Backend**: Express.js with TypeScript deployed on Render/Railway
- **Queue**: BullMQ with Upstash Redis (serverless)
- **Database**: MongoDB Atlas
- **Worker**: Separate persistent process running on Render/Railway

## 📁 Repository Structure

```
/client      // Next.js 14 (App Router) Admin UI
/server      // Node.js (Express) backend
/README.md
/docs/architecture.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB Atlas account
- Upstash Redis account
- Vercel account (for frontend)
- Render/Railway account (for backend and worker)

### Local Development Setup

#### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

#### 2. Environment Configuration

**Server** (`server/.env`):

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/job_import?retryWrites=true&w=majority
REDIS_URL=redis://default:password@upstash-redis-host:port
BULLMQ_PREFIX=job_import
BATCH_SIZE=200
WORKER_CONCURRENCY=10
PORT=3001
NEXT_PUBLIC_API_BASE=http://localhost:3001
FEEDS_JSON=["https://jobicy.com/?feed=job_feed","https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time",...]
```

**Client** (`client/.env.local`):

```env
NEXT_PUBLIC_API_BASE=http://localhost:3001
```

#### 3. Run the Application

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Worker Process:**
```bash
cd server
npm run worker
```

**Terminal 3 - Frontend:**
```bash
cd client
npm run dev
```

Visit `http://localhost:3000` to access the admin UI.

## 📦 Production Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import the `client` folder as a Vercel project
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_BASE` - Your backend API URL

**Deploy Command:**
```bash
cd client && npm run build
```

### Backend API (Render/Railway)

**Using Render:**

1. Create a new Web Service
2. Connect your GitHub repository
3. Set the root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Set environment variables:
   - `MONGO_URI`
   - `REDIS_URL`
   - `BULLMQ_PREFIX=job_import`
   - `BATCH_SIZE=200`
   - `WORKER_CONCURRENCY=10`
   - `PORT=3001`
   - `FEEDS_JSON=[...]`
   - `NEXT_PUBLIC_API_BASE` (your Render backend URL)

**Using Railway:**

1. Create a new project
2. Add a new service from GitHub
3. Select the `server` directory
4. Railway will auto-detect Node.js
5. Set environment variables (same as above)
6. Deploy

### Worker Process (Render/Railway)

**Important**: Workers MUST run as a separate service (NOT on Vercel).

**Using Render:**

1. Create a new Background Worker
2. Connect your GitHub repository
3. Set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm run worker:prod`
6. Set same environment variables as backend API

**Using Railway:**

1. Add another service in the same project
2. Select the `server` directory
3. Set start command: `npm run worker:prod`
4. Set environment variables

### Cron Job Setup

**Option 1: GitHub Actions (Recommended)**

Create `.github/workflows/cron.yml`:

```yaml
name: Hourly Job Import
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Import
        run: |
          curl -X POST ${{ secrets.BACKEND_URL }}/api/import/start \
            -H "Content-Type: application/json" \
            -d '{"feedUrl": "https://jobicy.com/?feed=job_feed"}'
```

**Option 2: Render Cron**

1. Create a Cron Job service on Render
2. Command: `node dist/cron.js`
3. Schedule: `0 * * * *` (every hour)

## 🔧 Configuration

### Environment Variables

See `.env.example` files in both `server` and `client` directories.

### Queue Configuration

- **Batch Size**: Number of jobs to process per batch (default: 200)
- **Concurrency**: Number of concurrent worker processes (default: 10)
- **Retry**: Failed jobs retry 3 times with exponential backoff

### MongoDB Indexes

The system automatically creates indexes on:
- `jobs`: `externalId + feedUrl` (unique), `feedUrl`, `createdAt`, `updatedAt`
- `import_logs`: `timestamp`, `fileName`

## 📊 API Endpoints

### `POST /api/import/start`

Start a new import for a feed URL.

**Request:**
```json
{
  "feedUrl": "https://jobicy.com/?feed=job_feed"
}
```

**Response:**
```json
{
  "success": true,
  "importLogId": "...",
  "totalFetched": 150,
  "batchesCreated": 1
}
```

### `GET /api/import/logs`

Get paginated import logs.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `fileName` (optional filter)

### `GET /api/import/logs/:id`

Get detailed import log with failed jobs.

## 🧪 Testing

```bash
cd server
npm test
```

Tests include:
- XML feed parsing
- Bulk upsert logic

## 📝 Features

- ✅ Multiple XML/RSS feed support
- ✅ Redis queue with BullMQ
- ✅ Bulk MongoDB upserts
- ✅ Import history tracking
- ✅ Failed job tracking
- ✅ Retry logic with exponential backoff
- ✅ Admin UI for monitoring
- ✅ Cron job support
- ✅ Production-ready error handling

## 🔍 Monitoring

- View import logs in the admin UI at `/imports`
- Check individual import details at `/imports/[id]`
- Monitor worker logs in Render/Railway dashboard
- Check MongoDB for stored jobs and logs

## 🚨 Important Notes

1. **Workers cannot run on Vercel** - Deploy workers on Render/Railway as separate services
2. **Upstash Redis** is recommended for serverless compatibility
3. **MongoDB Atlas** is required for production
4. **Cron jobs** should be set up separately (GitHub Actions or Render Cron)

## 🐛 Troubleshooting

### Worker not processing jobs
- Check Redis connection
- Verify worker is running and connected
- Check worker logs for errors

### Jobs failing to import
- Check MongoDB connection
- Verify job data format
- Check failed jobs in import log details

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_BASE` is set correctly
- Check CORS settings on backend
- Ensure backend is running and accessible

## 📚 Documentation

See `/docs/architecture.md` for detailed system architecture and scaling strategies.

## 🤝 Contributing

1. Follow TypeScript best practices
2. Maintain test coverage
3. Update documentation as needed

## 📄 License

ISC
