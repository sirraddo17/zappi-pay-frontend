import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import RateExperience from '../components/RateExperience';
import BottomNav from '../components/BottomNav';
import ShowMore, { FIRST_COUNT } from '../components/ShowMore';

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
  const [shown, setShown] = useState(FIRST_COUNT);

  function load() {
    getOrders()
      .then((data) => { setOrders(data.orders); setError(''); })
      .catch((err) => { if (!orders) setError(err.message); });
  }

  useEffect(load, []);
  // Pending orders switch to Successful / Refunded on their own.
  useAutoRefresh(load, Boolean(orders?.some((o) => o.status === 'PENDING')));

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Order History</h1>
        <p>Everything you've bought through ZAPPI PAY</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {orders?.[0] && <RateExperience order={orders[0]} maxAgeMs={30 * 60 * 1000} />}

      {orders === null ? (
        <p className="empty-state">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <>
        {orders.slice(0, shown).map((o) => (
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
        ))}
        <div style={{ margin: '0 16px' }}>
          <ShowMore total={orders.length} shown={shown} setShown={setShown} />
        </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
