# Quick Start Guide

## Local Development

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Upstash Redis account

### 2. Setup

```bash
# Install server dependencies
cd server
npm install
cp env.example .env
# Edit .env with your credentials

# Install client dependencies
cd ../client
npm install
cp env.example .env.local
# Edit .env.local with API URL
```

### 3. Run

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Worker:**
```bash
cd server
npm run worker
```

**Terminal 3 - Frontend:**
```bash
cd client
npm run dev
```

Visit http://localhost:3000

## Production Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import `client` folder in Vercel
3. Set `NEXT_PUBLIC_API_BASE` environment variable

### Backend (Render)
1. Create Web Service
2. Connect GitHub repo
3. Root directory: `server`
4. Build: `npm install && npm run build`
5. Start: `npm start`
6. Set all environment variables

### Worker (Render)
1. Create Background Worker
2. Same settings as backend
3. Start command: `npm run worker:prod`

### Cron (GitHub Actions)
1. Set `BACKEND_URL` secret in GitHub
2. Workflow runs hourly automatically

## Testing

```bash
cd server
npm test
```

## Configuration

See `README.md` for detailed configuration options.
