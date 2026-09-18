import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminSupportTickets, resolveSupportTicket } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  function load() {
    getAdminSupportTickets()
      .then((data) => setTickets(data.tickets))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleResolve(id) {
    setResolvingId(id);
    setError('');
    try {
      await resolveSupportTicket(id);
      load();
    } catch (err) {
      setError(err.message || 'Could not resolve this ticket.');
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Support</h1>
        <p>Customer complaints, general or tied to a specific order</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {tickets === null ? (
          <p className="empty-state">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="empty-state">No support tickets yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Message</th>
                <th>Order</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.customer?.name}
                    <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>{t.customer?.phone}</div>
                  </td>
                  <td style={{ maxWidth: 280 }}>{t.message}</td>
                  <td>
                    {t.order ? (
                      <>
                        {t.order.service} — {t.order.recipient}
                        <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>{fmtMoney(t.order.amount)}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--slate-400)' }}>General</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${t.status === 'RESOLVED' ? 'active' : 'inactive'}`}
                    >
                      {t.status === 'RESOLVED' ? 'Solved' : 'Open'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--slate-400)', fontSize: 13 }}>{fmtDate(t.createdAt)}</td>
                  <td>
                    {t.status !== 'RESOLVED' && (
                      <button
                        className="btn-secondary btn"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                        onClick={() => handleResolve(t.id)}
                        disabled={resolvingId === t.id}
                      >
                        {resolvingId === t.id ? 'Saving…' : 'Mark Resolved'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
