import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../api';
import BottomNav from '../components/BottomNav';

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

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Order History</h1>
        <p>Everything you've bought through ZAPPI PAY</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {orders === null ? (
        <p className="empty-state">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        orders.map((o) => (
          <Link to={`/orders/${o.id}`} className="card" key={o.id} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{o.service}</div>
                <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>{o.recipient}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{fmtMoney(o.amount)}</div>
                <div style={{ color: STATUS_COLORS[o.status] || 'var(--slate-400)', fontSize: 13 }}>{o.status}</div>
              </div>
            </div>
            <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 8 }}>{fmtDate(o.createdAt)}</div>
          </Link>
        ))
      )}

      <BottomNav />
    </div>
  );
}
