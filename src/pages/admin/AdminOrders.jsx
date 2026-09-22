import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminOrders } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = {
  SUCCESS: 'var(--green-500)',
  PENDING: 'var(--slate-400)',
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
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getAdminOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, []);

  const filtered = orders === null ? null : filter === 'ALL' ? orders : orders.filter((o) => o.service === filter);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Orders</h1>
        <p>Every purchase across all customers</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={f.value === filter ? 'btn' : 'btn-secondary btn'}
            style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
          >
            {f.label}
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
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.customer.name}</td>
                  <td>{o.service}</td>
                  <td>{o.recipient}</td>
                  <td>{fmtMoney(o.amount)}</td>
                  <td style={{ color: STATUS_COLORS[o.status] || 'var(--slate-400)' }}>{o.status}</td>
                  <td>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
