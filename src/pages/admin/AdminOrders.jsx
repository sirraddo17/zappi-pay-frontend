import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminOrders, recheckAdminOrder, settleAdminOrder, reportOrderToVtpass, createEscalation } from '../../api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';
import { useShowMore } from '../../components/ShowMore';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = {
  SUCCESS: 'var(--green-500)',
  PENDING: 'var(--orange, #f97316)',
  FAILED: 'var(--red-500)',
  REFUNDED: 'var(--orange)',
};

const SERVICE_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'AIRTIME', label: 'Airtime' },
  { value: 'DATA', label: 'Data' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'CABLE', label: 'Cable TV' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'BETTING', label: 'Bet Funding' },
];

export default function AdminOrders() {
  const { isOwner } = useAdminAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');

  function load() {
    getAdminOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }
  useEffect(load, []);
  useAutoRefresh(load, true, ADMIN_REFRESH);

  async function reportVtpass(o) {
    const note = window.prompt(`What should VTpass check for ${o.service} ${o.recipient}? (e.g. "customer says token not received")`);
    if (!note) return;
    act(o, () => reportOrderToVtpass(o.id, note), (r) => r.message || 'reported to VTpass');
  }

  async function askRefund(o) {
    const reason = window.prompt('Why should this be refunded? What did you check? (the owner sees this)');
    if (!reason) return;
    if (!window.confirm('Confirm: the customer was debited and did NOT receive the service?')) return;
    act(o, () => createEscalation({ type: 'ORDER_REFUND', customerId: o.customer.id, orderId: o.id, reason, debitConfirmed: true }), (r) => (r.resolved ? r.message : `sent for approval (${r.escalation.ref}); the customer was told`));
  }

  async function act(o, fn, text) {
    setBusy(o.id);
    setError('');
    setMessage('');
    try {
      const r = await fn();
      setMessage(`${o.service} for ${o.recipient}: ${text(r)}`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const pendingCount = (orders || []).filter((o) => o.status === 'PENDING').length;

  const filtered = orders === null ? null : filter === 'ALL' ? orders : orders.filter((o) => o.service === filter);
  // Last 5 of the chosen service (or all), the rest behind "Show more".
  const page = useShowMore(filtered, [filter]);
  const countFor = (v) => (orders || []).filter((o) => v === 'ALL' || o.service === v).length;

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Orders</h1>
        <p>Every purchase across all customers — the newest 5 show first; tap “Show more” for older ones.</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', margin: '0 0 12px' }}>{message}</p>}
      {pendingCount > 0 && (
        <div className="card" style={{ margin: '0 0 12px', border: '1px solid var(--orange, #f97316)', fontSize: 14 }}>
          <strong>{pendingCount} order{pendingCount === 1 ? '' : 's'} waiting on VTpass.</strong> These are re-checked automatically and settled (or refunded) as soon as VTpass confirms. Use “Check now”, or settle by hand only after confirming with VTpass support.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={f.value === filter ? 'btn' : 'btn-secondary btn'}
            style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
          >
            {f.label}{orders ? ` (${countFor(f.value)})` : ''}
          </button>
        ))}
      </div>

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {filtered === null ? (
          <p className="empty-state">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No orders match this filter.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {page.visible.map((o) => (
                <tr key={o.id}>
                  <td>{o.customer.name}</td>
                  <td>{o.service}</td>
                  <td>{o.recipient}</td>
                  <td>{fmtMoney(o.amount)}</td>
                  <td style={{ color: STATUS_COLORS[o.status] || 'var(--slate-400)' }}>
                    {o.status}
                    {o.status === 'SUCCESS' && (
                      <div style={{ marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>
                          {o.vtpassEscalatedAt ? 'Reported ✓' : 'Report to VTpass'}
                        </button>
                      </div>
                    )}
                    {o.status === 'PENDING' && !isOwner && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => act(o, () => recheckAdminOrder(o.id), (r) => `status now ${r.status}`)}>Check now</button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>Report to VTpass</button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => askRefund(o)}>Ask admin to refund</button>
                      </div>
                    )}
                    {o.status === 'PENDING' && isOwner && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => act(o, () => recheckAdminOrder(o.id), (r) => `status now ${r.status}`)}>
                          Check now
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => window.confirm('Mark as DELIVERED? Only do this if VTpass confirmed it was delivered.') && act(o, () => settleAdminOrder(o.id, 'SUCCESS'), (r) => `marked ${r.status}`)}>
                          Delivered
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => window.confirm('Mark as FAILED and refund the customer? Only do this if VTpass confirmed it was NOT delivered.') && act(o, () => settleAdminOrder(o.id, 'FAILED'), (r) => `marked ${r.status}, customer refunded`)}>
                          Failed + refund
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>
                          Report to VTpass
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{fmtDate(o.createdAt)}</td>
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
