import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <div className="header">
        <h1>Job Import System</h1>
      </div>
      <div className="card">
        <h2>Welcome to the Job Import System</h2>
        <p>This is the admin interface for managing job imports from various feeds.</p>
        <div style={{ marginTop: '2rem' }}>
          <Link href="/imports" className="btn btn-primary">
            View Import Logs
          </Link>
        </div>
      </div>
    </div>
  );
}
