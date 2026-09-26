import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdminAirtimeCash, approveAirtimeCash, rejectAirtimeCash } from '../../api';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';

const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];
const NETWORK_LABELS = { mtn: 'MTN', glo: 'Glo', airtel: 'Airtel', etisalat: '9mobile' };

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function payoutFor(amount, feePercent) {
  return Math.max(0, Math.floor(Number(amount || 0) * (1 - Number(feePercent || 0) / 100)));
}

// One pending request. Approve credits the wallet (optionally for a
// smaller amount if less airtime actually arrived); Reject needs a
// reason, which the customer sees in their notification.
function PendingCard({ r, onDone }) {
  const [mode, setMode] = useState('');
  const [received, setReceived] = useState(String(Number(r.amount)));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onDone();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  const payout = payoutFor(received, r.feePercent);

  return (
    <div className="card" style={{ margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            {NETWORK_LABELS[r.network] || r.network} {naira(r.amount)} from {r.senderPhone}
          </div>
          <div style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 2 }}>
            <Link to={`/admin/customers/${r.customer.id}`} style={{ color: 'inherit' }}>{r.customer.name}</Link> · {r.customer.phone}
            {r.customer.username ? ` · @${r.customer.username}` : ''} · {fmtDate(r.createdAt)}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Fee {Number(r.feePercent)}% · Payout <strong>{naira(r.payoutAmount)}</strong>
            {r.orderId ? ' · Linked to an airtime purchase' : ''}
          </div>
          {r.note && <div style={{ fontSize: 13, marginTop: 4 }}>Customer note: {r.note}</div>}
        </div>
        {!mode && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button className="btn" type="button" style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => setMode('approve')}>
              Approve
            </button>
            <button className="btn-secondary btn" type="button" style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => setMode('reject')}>
              Reject
            </button>
          </div>
        )}
      </div>

      {error && <p className="error-text" style={{ margin: '10px 0 0' }}>{error}</p>}

      {mode === 'approve' && (
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <div className="field">
            <label htmlFor={`recv-${r.id}`}>Airtime actually received (₦)</label>
            <input id={`recv-${r.id}`} type="number" min="1" max={Number(r.amount)} value={received} onChange={(e) => setReceived(e.target.value)} />
          </div>
          <p style={{ fontSize: 13, margin: '0 0 10px' }}>
            Only approve once you've seen the airtime arrive. This credits <strong>{naira(payout)}</strong> to the customer's wallet.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="button" disabled={busy || payout <= 0} onClick={() => run(() => approveAirtimeCash(r.id, { receivedAmount: Number(received) }))}>
              {busy ? 'Approving…' : `Confirm & credit ${naira(payout)}`}
            </button>
            <button className="btn-secondary btn" type="button" disabled={busy} onClick={() => setMode('')}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <div className="field">
            <label htmlFor={`reason-${r.id}`}>Reason (the customer will see this)</label>
            <input id={`reason-${r.id}`} type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. No airtime received from this number" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="button" disabled={busy || !reason.trim()} onClick={() => run(() => rejectAirtimeCash(r.id, reason.trim()))}>
              {busy ? 'Rejecting…' : 'Reject Request'}
            </button>
            <button className="btn-secondary btn" type="button" disabled={busy} onClick={() => setMode('')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAirtimeCash() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState('');

  function load(which = status, quiet = false) {
    if (!quiet) setRequests(null);
    getAdminAirtimeCash(which)
      .then((data) => {
        setRequests(data.requests || []);
        setPendingCount(data.pendingCount || 0);
      })
      .catch((err) => {
        setError(err.message);
        setRequests([]);
      });
  }

  useEffect(() => load(status), [status]);
  useAutoRefresh(() => load(status, true), true, ADMIN_REFRESH);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Airtime to Cash</h1>
        <p>Confirm the airtime arrived on the business line before approving</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={s.value === status ? 'btn' : 'btn-secondary btn'}
            style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
          >
            {s.label}{s.value === 'PENDING' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {requests === null ? (
        <p className="empty-state">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="empty-state">No {status.toLowerCase()} requests.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
          {requests.map((r) =>
            status === 'PENDING' ? (
              <PendingCard key={r.id} r={r} onDone={() => load('PENDING')} />
            ) : (
              <div key={r.id} className="card" style={{ margin: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {NETWORK_LABELS[r.network] || r.network} {naira(r.amount)} from {r.senderPhone}
                </div>
                <div style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 2 }}>
                  {r.customer.name} · {r.customer.phone} · requested {fmtDate(r.createdAt)}
                  {r.reviewedAt ? ` · reviewed ${fmtDate(r.reviewedAt)}` : ''}
                </div>
                {r.status === 'APPROVED' && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Received {naira(r.receivedAmount ?? r.amount)} · Credited <strong>{naira(r.payoutAmount)}</strong>
                  </div>
                )}
                {r.adminNote && <div style={{ fontSize: 13, marginTop: 4 }}>{r.status === 'REJECTED' ? 'Reason: ' : 'Note: '}{r.adminNote}</div>}
              </div>
            )
          )}
        </div>
      )}
    </AdminLayout>
  );
}
