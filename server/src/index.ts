import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { startImport, getLogs, getLogById } from './controllers/importController';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/import/start', startImport);
app.get('/api/import/logs', getLogs);
app.get('/api/import/logs/:id', getLogById);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

async function main() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
