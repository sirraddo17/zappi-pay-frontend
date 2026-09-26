import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import ShowMore, { FIRST_COUNT } from '../../components/ShowMore';
import { getAdminBankTransfers, authorizeBankTransfer, resendBankTransferOtp, checkBankTransfer, cancelBankTransfer, releaseBankTransfer } from '../../api';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';

function money(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'HELD', label: 'Held (fraud check)' },
  { key: 'PENDING_AUTHORIZATION', label: 'Needs OTP' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SUCCESS', label: 'Sent' },
  { key: 'FAILED', label: 'Failed' },
];

const COLORS = { SUCCESS: 'var(--green-500)', FAILED: 'var(--red-500)', REVERSED: 'var(--red-500)', PROCESSING: 'var(--orange, #f97316)', HELD: 'var(--red-500)', PENDING_AUTHORIZATION: 'var(--orange, #f97316)' };

// Customer transfers to bank accounts. Monnify asks for an email OTP on
// each transfer unless 2FA is turned off for API transfers — those wait
// here under "Needs OTP".
export default function AdminBankTransfers() {
  const [filter, setFilter] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [otps, setOtps] = useState({});
  const [shown, setShown] = useState(FIRST_COUNT);

  function load(f = filter) {
    getAdminBankTransfers(f)
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setShown(FIRST_COUNT);
    load(filter);
  }, [filter]);

  // Keep statuses current (e.g. Processing → Sent after the OTP).
  useAutoRefresh(() => load(), true, ADMIN_REFRESH);

  async function run(id, fn, okText) {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const res = await fn();
      setMessage(okText(res));
      load();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const transfers = data?.transfers || [];

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Bank Transfers</h1>
        <p>Customers sending money from their wallet to bank accounts</p>
      </div>

      {data?.held > 0 && (
        <div className="card" style={{ margin: '0 0 12px', border: '1px solid var(--red-500)' }}>
          <strong>{data.held} transfer{data.held === 1 ? '' : 's'} held for a fraud check.</strong>
          <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 0' }}>
            Large transfers soon after signup or a PIN/password/new-device change wait here. If in doubt, call the customer on their registered number before releasing.
          </p>
        </div>
      )}

      {data?.waiting > 0 && (
        <div className="card" style={{ margin: '0 0 12px', border: '1px solid var(--orange, #f97316)' }}>
          <strong>{data.waiting} transfer{data.waiting === 1 ? '' : 's'} waiting for your OTP.</strong>
          <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 0' }}>
            Monnify emails an OTP for each transfer. Enter it below to release the money. To skip this step, ask Monnify support to turn off 2FA for API transfers on your account.
          </p>
        </div>
      )}

      <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={filter === f.key ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', margin: '0 0 12px' }}>{message}</p>}

      {data === null ? (
        <p className="empty-state">Loading…</p>
      ) : transfers.length === 0 ? (
        <p className="empty-state">No transfers here.</p>
      ) : (
        <>
          {transfers.slice(0, shown).map((t) => (
            <div className="card" style={{ margin: '0 0 12px' }} key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{t.accountName}</div>
                  <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>{t.bankName || t.bankCode} · {t.accountNumber}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    From <Link to={`/admin/customers/${t.customer.id}`} style={{ color: 'var(--purple)' }}>{t.customer.name}</Link> · {t.customer.phone}
                  </div>
                  <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>{fmtDate(t.createdAt)} · Ref {t.reference}</div>
                  {t.failureReason && <div style={{ color: 'var(--red-500)', fontSize: 12, marginTop: 4 }}>{t.status === 'HELD' ? `Held: ${t.failureReason}` : t.failureReason}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{money(t.amount)}</div>
                  {Number(t.fee) > 0 && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>+ {money(t.fee)} fee</div>}
                  <div style={{ fontSize: 13, color: COLORS[t.status] || 'var(--slate-400)' }}>{t.status === 'PENDING_AUTHORIZATION' ? 'NEEDS OTP' : t.status === 'HELD' ? 'HELD' : t.status}</div>
                </div>
              </div>

              {t.status === 'PENDING_AUTHORIZATION' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      inputMode="numeric"
                      placeholder="OTP from Monnify email"
                      value={otps[t.id] || ''}
                      onChange={(e) => setOtps((o) => ({ ...o, [t.id]: e.target.value.trim() }))}
                      style={{ flex: '1 1 160px' }}
                    />
                    <button className="btn" style={{ width: 'auto' }} disabled={busyId === t.id || !otps[t.id]} onClick={() => run(t.id, () => authorizeBankTransfer(t.id, otps[t.id]), (r) => `Authorized — status: ${r.status}.`)}>
                      Release
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ width: 'auto' }} disabled={busyId === t.id} onClick={() => run(t.id, () => resendBankTransferOtp(t.id), () => 'OTP resent to your Monnify email.')}>
                      Resend OTP
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ width: 'auto' }}
                      disabled={busyId === t.id}
                      onClick={() => {
                        if (window.confirm('Cancel this transfer and refund the customer? Do NOT approve it in the Monnify dashboard afterwards.')) {
                          run(t.id, () => cancelBankTransfer(t.id), () => 'Cancelled — customer refunded.');
                        }
                      }}
                    >
                      Cancel & refund
                    </button>
                  </div>
                </div>
              )}

              {t.status === 'HELD' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="btn" style={{ width: 'auto' }} disabled={busyId === t.id} onClick={() => window.confirm(`Send ${money(t.amount)} to ${t.accountName}?`) && run(t.id, () => releaseBankTransfer(t.id), (r) => `Released — status: ${r.status}.`)}>
                    Release & send
                  </button>
                  <button className="btn btn-secondary" style={{ width: 'auto' }} disabled={busyId === t.id} onClick={() => window.confirm('Cancel this transfer and refund the customer?') && run(t.id, () => cancelBankTransfer(t.id), () => 'Cancelled — customer refunded.')}>
                    Cancel & refund
                  </button>
                </div>
              )}

              {t.status === 'PROCESSING' && (
                <button className="btn btn-secondary" style={{ width: 'auto', marginTop: 12 }} disabled={busyId === t.id} onClick={() => run(t.id, () => checkBankTransfer(t.id), (r) => `Status: ${r.status}.`)}>
                  Check status
                </button>
              )}
            </div>
          ))}
          <ShowMore total={transfers.length} shown={shown} setShown={setShown} />
        </>
      )}
    </AdminLayout>
  );
}
