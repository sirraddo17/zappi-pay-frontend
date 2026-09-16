import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getPendingFunding, approveFunding, rejectFunding } from '../../api';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPendingFunding() {
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    getPendingFunding()
      .then((data) => setTransactions(data.transactions))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleApprove(id) {
    setBusyId(id);
    setError('');
    try {
      await approveFunding(id);
      load();
    } catch (err) {
      setError(err.message || 'Could not approve.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError('');
    try {
      await rejectFunding(id);
      load();
    } catch (err) {
      setError(err.message || 'Could not reject.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Pending Funding</h1>
        <p>Wallet funding requests awaiting your approval</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {transactions === null ? (
        <p className="empty-state">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="empty-state">Nothing pending.</p>
      ) : (
        transactions.map((t) => (
          <div className="card" style={{ margin: '0 0 12px' }} key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t.customer.name}</div>
                <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>{t.customer.phone}</div>
                {t.reference && <div style={{ fontSize: 13, marginTop: 4 }}>Ref: {t.reference}</div>}
                {t.note && <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{t.note}</div>}
                <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>{fmtDate(t.createdAt)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(t.amount)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => handleApprove(t.id)} disabled={busyId === t.id}>
                Approve
              </button>
              <button className="btn-secondary btn" onClick={() => handleReject(t.id)} disabled={busyId === t.id}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </AdminLayout>
  );
}
