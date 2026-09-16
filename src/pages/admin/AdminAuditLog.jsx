import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAuditLog } from '../../api';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuditLog()
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Audit Log</h1>
        <p>Sensitive admin actions — settings changes, customer status changes</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {logs === null ? (
          <p className="empty-state">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="empty-state">Nothing logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Details</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.action}</td>
                  <td style={{ fontSize: 12, color: 'var(--slate-400)' }}>{l.details ? JSON.stringify(l.details) : '—'}</td>
                  <td>{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
