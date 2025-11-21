'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getImportLogById, ImportLog } from '@/lib/api';
import { format } from 'date-fns';

export default function ImportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [log, setLog] = useState<ImportLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getImportLogById(id);
        setLog(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch import log');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLog();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="container">
        <div className="error">{error || 'Import log not found'}</div>
        <Link href="/imports">
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Back to Imports
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Import Details</h1>
      </div>

      <div className="card">
        <h2>Import Information</h2>
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Feed URL:</strong> {log.fileName}</p>
          <p><strong>Timestamp:</strong> {format(new Date(log.timestamp), 'PPpp')}</p>
          <p><strong>Status:</strong> <span className={`badge badge-${log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'warning'}`}>{log.status}</span></p>
          <p><strong>Total Fetched:</strong> {log.totalFetched}</p>
          <p><strong>Total Imported:</strong> {log.totalImported}</p>
          <p><strong>New Jobs:</strong> {log.newJobs}</p>
          <p><strong>Updated Jobs:</strong> {log.updatedJobs}</p>
          <p><strong>Failed Jobs:</strong> {log.failedJobs.length}</p>
        </div>
      </div>

      {log.failedJobs.length > 0 && (
        <div className="card">
          <h2>Failed Jobs</h2>
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {log.failedJobs.map((failedJob, index) => (
                <tr key={index}>
                  <td>
                    <code style={{ fontSize: '0.875rem' }}>{failedJob.id}</code>
                  </td>
                  <td>{failedJob.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link href="/imports">
          <button className="btn btn-primary">Back to Imports</button>
        </Link>
      </div>
    </div>
  );
}
