import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ImportLog {
  _id: string;
  timestamp: string;
  fileName: string;
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

export interface ImportLogsResponse {
  logs: ImportLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function startImport(feedUrl: string) {
  const response = await api.post('/api/import/start', { feedUrl });
  return response.data;
}

export async function getImportLogs(page: number = 1, limit: number = 20, fileName?: string): Promise<ImportLogsResponse> {
  const params: any = { page, limit };
  if (fileName) {
    params.fileName = fileName;
  }
  const response = await api.get('/api/import/logs', { params });
  return response.data;
}

export async function getImportLogById(id: string): Promise<ImportLog> {
  const response = await api.get(`/api/import/logs/${id}`);
  return response.data;
}
