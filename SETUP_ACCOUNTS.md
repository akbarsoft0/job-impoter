# Account Setup Guide

## Accounts Required

To use the worker, you need accounts for the following services:

### ✅ **REQUIRED for Local Development**

#### 1. **MongoDB Atlas** (Free tier available)
   - **Why**: Store jobs, import logs, and raw feeds
   - **Free tier**: Yes (512MB storage)
   - **Setup**:
     1. Go to https://www.mongodb.com/cloud/atlas/register
     2. Sign up for free account
     3. Create a new cluster (choose free M0 tier)
     4. Create database user (Database Access → Add New User)
     5. Whitelist your IP (Network Access → Add IP Address → Add Current IP Address)
     6. Get connection string: Clusters → Connect → Connect your application
     7. Copy connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/...`)

#### 2. **Upstash Redis** (Free tier available)
   - **Why**: Queue system for processing jobs (BullMQ needs Redis)
   - **Free tier**: Yes (10,000 commands/day)
   - **Setup**:
     1. Go to https://console.upstash.com/
     2. Sign up for free account
     3. Create a new Redis database
     4. Choose region closest to you
     5. Click on your database → Copy "Redis URL"
     6. It looks like: `redis://default:password@host:port` or `rediss://default:password@host:port`

### 📝 **Optional for Production Deployment**

#### 3. **Render** (Free tier available)
   - **Why**: Host backend API and worker process
   - **Free tier**: Yes (but services sleep after inactivity)
   - **Setup**:
     1. Go to https://render.com/
     2. Sign up with GitHub
     3. Create Web Service for backend
     4. Create Background Worker for worker process

#### 4. **Railway** (Alternative to Render)
   - **Why**: Host backend API and worker process
   - **Free tier**: $5 credit per month
   - **Setup**:
     1. Go to https://railway.app/
     2. Sign up with GitHub
     3. Create new project
     4. Add services (API and Worker)

#### 5. **Vercel** (Free tier available)
   - **Why**: Host frontend Next.js app
   - **Free tier**: Yes (unlimited projects)
   - **Setup**:
     1. Go to https://vercel.com/
     2. Sign up with GitHub
     3. Import repository
     4. Deploy frontend

#### 6. **GitHub** (Free)
   - **Why**: Use GitHub Actions for cron jobs
   - **Free tier**: Yes (2,000 minutes/month)
   - **Setup**:
     1. Push code to GitHub repository
     2. Set up GitHub Actions workflow for cron

---

## Quick Setup Steps

### Step 1: Create MongoDB Atlas Account

1. Visit https://www.mongodb.com/cloud/atlas/register
2. Click "Try Free"
3. Fill in your details and create account
4. Choose your organization (or create one)
5. Select **FREE** M0 cluster
6. Choose a cloud provider and region
7. Click "Create Cluster" (takes 3-5 minutes)

**After cluster is created:**
1. Go to **Database Access** → Click "Add New Database User"
   - Username: `job_import_user` (or your choice)
   - Password: Generate secure password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

2. Go to **Network Access** → Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your current IP address
   - Click "Confirm"

3. Go to **Clusters** → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<database>` with `job_import`

Example connection string:
```
mongodb+srv://job_import_user:your-password@cluster0.xxxxx.mongodb.net/job_import?retryWrites=true&w=majority
```

### Step 2: Create Upstash Redis Account

1. Visit https://console.upstash.com/
2. Click "Sign Up" or "Log In"
3. Sign up with email or GitHub
4. Click "Create Database"
5. Enter database name: `job-import-queue`
6. Choose region (closest to you)
7. Choose **FREE** tier
8. Click "Create"
9. Click on your database
10. Copy the **Redis URL** from the dashboard

Example Redis URL:
```
redis://default:AbCdEf123456@eu1-upstash-redis.xxxxx.upstash.io:6379
```

or for TLS:
```
rediss://default:AbCdEf123456@eu1-upstash-redis.xxxxx.upstash.io:6380
```

### Step 3: Update Environment Variables

Create `server/.env` file:

```env
# MongoDB Atlas (from Step 1)
MONGO_URI=mongodb+srv://job_import_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/job_import?retryWrites=true&w=majority

# Upstash Redis (from Step 2)
REDIS_URL=redis://default:YOUR_PASSWORD@eu1-upstash-redis.xxxxx.upstash.io:6379

# BullMQ Configuration
BULLMQ_PREFIX=job_import
BATCH_SIZE=200
WORKER_CONCURRENCY=10

# API Configuration
PORT=3001
NEXT_PUBLIC_API_BASE=http://localhost:3001

# Job Feed URLs
FEEDS_JSON=["https://jobicy.com/?feed=job_feed","https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time","https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france","https://jobicy.com/?feed=job_feed&job_categories=design-multimedia","https://jobicy.com/?feed=job_feed&job_categories=data-science","https://jobicy.com/?feed=job_feed&job_categories=copywriting","https://jobicy.com/?feed=job_feed&job_categories=business","https://jobicy.com/?feed=job_feed&job_categories=management","https://www.higheredjobs.com/rss/articleFeed.cfm"]
```

### Step 4: Test the Worker

```bash
cd server
npm install
npm run worker
```

You should see:
```
Starting worker...
Concurrency: 10
Connecting to MongoDB...
Successfully connected to MongoDB
Database indexes created
Connected to MongoDB
Worker started and waiting for jobs...
MongoDB connection health checks running every 60 seconds
```

---

## Cost Summary

### Free Tier (Development/Testing)
- **MongoDB Atlas**: Free (512MB storage, shared RAM/CPU)
- **Upstash Redis**: Free (10,000 commands/day)
- **Total**: $0/month

### Production (Small Scale)
- **MongoDB Atlas M10**: ~$57/month (2GB RAM, 10GB storage)
- **Upstash Redis**: Free tier usually sufficient
- **Render**: $7/month per service (API + Worker = $14/month) OR
- **Railway**: $5-10/month (pay per usage)
- **Vercel**: Free (unlimited projects)
- **Total**: ~$70-80/month

---

## Troubleshooting

### MongoDB Connection Issues
- Verify IP whitelist includes your IP address
- Check username/password in connection string
- Ensure cluster is fully created (can take 5-10 minutes)

### Redis Connection Issues
- Verify Redis URL format is correct
- Check if you're using TLS (rediss://) vs non-TLS (redis://)
- Ensure database is created and active in Upstash console

### Worker Not Processing Jobs
- Check that worker is connected to MongoDB
- Verify Redis connection is working
- Check that jobs are being enqueued (backend logs)

---

## Next Steps

Once you have MongoDB Atlas and Upstash Redis set up:

1. ✅ Test locally with `npm run worker`
2. ✅ Test backend API with `npm run dev`
3. ✅ Test frontend with `cd client && npm run dev`
4. 📦 Deploy to production (optional)

You're all set! The worker can now process jobs from the queue.


