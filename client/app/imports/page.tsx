'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImportLogs, startImport, ImportLog } from '@/lib/api';
import { format } from 'date-fns';

export default function ImportsPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importing, setImporting] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getImportLogs(page, 20);
      setLogs(response.logs);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch import logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleStartImport = async () => {
    if (!feedUrl.trim()) {
      setError('Please enter a feed URL');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      await startImport(feedUrl);
      setFeedUrl('');
      // Refresh logs after import starts
      setTimeout(() => {
        fetchLogs();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to start import');
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badgeClass = {
      pending: 'badge badge-warning',
      processing: 'badge badge-warning',
      completed: 'badge badge-success',
      failed: 'badge badge-error',
    }[status] || 'badge';

    return <span className={badgeClass}>{status}</span>;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Import Logs</h1>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Start New Import</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <input
            type="text"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="Enter feed URL"
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '0.5rem',
              fontSize: '1rem',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleStartImport}
            disabled={importing}
          >
            {importing ? 'Starting...' : 'Start Import'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Import History</h2>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="loading">No import logs found</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Feed URL</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>New</th>
                  <th>Updated</th>
                  <th>Failed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.fileName}
                      </div>
                    </td>
                    <td>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}</td>
                    <td>{getStatusBadge(log.status)}</td>
                    <td>{log.totalImported}</td>
                    <td>{log.newJobs}</td>
                    <td>{log.updatedJobs}</td>
                    <td>{log.failedJobs.length}</td>
                    <td>
                      <Link href={`/imports/${log._id}`}>
                        <button className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                          View Details
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                className="btn btn-primary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
