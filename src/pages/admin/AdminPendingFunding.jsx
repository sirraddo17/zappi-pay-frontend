import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useShowMore } from '../../components/ShowMore';
import { getPendingFunding, approveFunding, rejectFunding } from '../../api';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPendingFunding() {
  const [transactions, setTransactions] = useState(null);
  const listPage = useShowMore(transactions, []);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, reason }
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  function load() {
    getPendingFunding()
      .then((data) => setTransactions(data.transactions))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);
  useAutoRefresh(load, true, ADMIN_REFRESH);

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

  async function handleReject(id, reason) {
    setBusyId(id);
    setError('');
    try {
      await rejectFunding(id, reason);
      setRejecting(null);
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
        listPage.visible.map((t) => (
          <div className="card" style={{ margin: '0 0 12px' }} key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t.customer.name}</div>
                <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>{t.customer.phone}</div>
                {t.reference && <div style={{ fontSize: 13, marginTop: 4 }}>Ref: {t.reference}</div>}
                {t.note && <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{t.note}</div>}
                <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>
                  {fmtDate(t.createdAt)} · {(() => { const m = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000); return <b style={{ color: m >= 30 ? 'var(--red-500)' : m >= 15 ? 'var(--gold, #FFB830)' : 'var(--green-500)' }}>waiting {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`}</b>; })()}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(t.amount)}</div>
            </div>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '10px 0 0' }}>Check your bank app for this amount{t.reference ? ' and reference' : ''} first. Approve adds it to their wallet straight away.</p>
            {rejecting?.id === t.id ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input value={rejecting.reason} onChange={(e) => setRejecting({ id: t.id, reason: e.target.value })} placeholder="Reason the customer sees, e.g. not received in our bank" style={{ flex: '1 1 200px' }} autoFocus />
                <button className="btn-secondary btn" style={{ width: 'auto' }} onClick={() => handleReject(t.id, rejecting.reason.trim())} disabled={busyId === t.id}>Confirm reject</button>
                <button type="button" onClick={() => setRejecting(null)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => handleApprove(t.id)} disabled={busyId === t.id}>
                  Approve
                </button>
                <button className="btn-secondary btn" onClick={() => setRejecting({ id: t.id, reason: '' })} disabled={busyId === t.id}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}
      {listPage.more}
    </AdminLayout>
  );
}
