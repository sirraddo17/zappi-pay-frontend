import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAuditLog } from '../../api';
import { useShowMore } from '../../components/ShowMore';

// Short, readable summary instead of raw JSON.
function detailText(d) {
  if (!d || typeof d !== 'object') return '—';
  return Object.entries(d)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && !/Id$/.test(k))
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ') || '—';
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const filtered = logs === null ? null : logs.filter((l) => !q.trim() || `${l.action} ${detailText(l.details)}`.toLowerCase().includes(q.trim().toLowerCase()));
  const page = useShowMore(filtered, [q], 10);

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

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, names…" style={{ marginBottom: 12, maxWidth: 360 }} />
      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {filtered === null ? (
          <p className="empty-state">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">{q ? 'Nothing matches that search.' : 'Nothing logged yet.'}</p>
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
              {page.visible.map((l) => (
                <tr key={l.id}>
                  <td>{String(l.action).replace(/_/g, ' ').toLowerCase()}</td>
                  <td style={{ fontSize: 12, color: 'var(--slate-400)', maxWidth: 380, wordBreak: 'break-word' }}>{detailText(l.details)}</td>
                  <td>{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {page.more}
      </div>
    </AdminLayout>
  );
}
