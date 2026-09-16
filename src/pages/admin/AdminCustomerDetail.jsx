import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getCustomerDetail, adjustWallet } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = {
  SUCCESS: 'var(--green-500)',
  APPROVED: 'var(--green-500)',
  PENDING: 'var(--slate-400)',
  FAILED: 'var(--red-500)',
  REJECTED: 'var(--red-500)',
  REFUNDED: 'var(--orange)',
};

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  function load() {
    getCustomerDetail(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleAdjustSubmit(e) {
    e.preventDefault();
    setAdjustError('');
    setAdjustSubmitting(true);
    try {
      await adjustWallet(id, { type: adjustType, amount: Number(adjustAmount), note: adjustNote.trim() || undefined });
      setAdjustAmount('');
      setAdjustNote('');
      load();
    } catch (err) {
      setAdjustError(err.message || 'Could not adjust wallet.');
    } finally {
      setAdjustSubmitting(false);
    }
  }

  if (error) {
    return (
      <AdminLayout>
        <p className="error-text" style={{ margin: 0 }}>{error}</p>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <p className="empty-state">Loading…</p>
      </AdminLayout>
    );
  }

  const { customer, orders, walletTransactions } = data;

  return (
    <AdminLayout>
      <Link to="/admin/customers" style={{ color: 'var(--orange)', fontSize: 13 }}>← Back to Customers</Link>

      <div className="page-header" style={{ padding: 0, margin: '12px 0 16px' }}>
        <h1>{customer.name}</h1>
        <p>{customer.phone}{customer.email ? ` · ${customer.email}` : ''} · {customer.active ? 'Active' : 'Deactivated'} · Joined {fmtDate(customer.createdAt)}</p>
      </div>

      <div className="card stat-card" style={{ margin: '0 0 16px', maxWidth: 260 }}>
        <div className="label">Wallet Balance</div>
        <div className="value">{fmtMoney(customer.walletBalance)}</div>
      </div>

      <form className="card" style={{ margin: '0 0 16px', maxWidth: 400 }} onSubmit={handleAdjustSubmit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Adjust Wallet</h2>
        {adjustError && <p className="error-text" style={{ margin: '0 0 12px' }}>{adjustError}</p>}
        <div className="field">
          <label htmlFor="adjustType">Type</label>
          <select id="adjustType" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
            <option value="CREDIT">Credit (add funds)</option>
            <option value="DEBIT">Debit (remove funds)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="adjustAmount">Amount (₦)</label>
          <input id="adjustAmount" type="number" min="1" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="adjustNote">Reason (optional)</label>
          <input id="adjustNote" type="text" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={adjustSubmitting}>
          {adjustSubmitting ? 'Saving…' : 'Apply Adjustment'}
        </button>
      </form>

      <div className="card admin-table-wrap" style={{ margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Orders</h2>
        {orders.length === 0 ? (
          <p className="empty-state">No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
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

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Wallet History</h2>
        {walletTransactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Note</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.type}</td>
                  <td>{fmtMoney(t.amount)}</td>
                  <td style={{ color: STATUS_COLORS[t.status] || 'var(--slate-400)' }}>{t.status}</td>
                  <td style={{ fontSize: 12, color: 'var(--slate-400)' }}>{t.note || '—'}</td>
                  <td>{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
