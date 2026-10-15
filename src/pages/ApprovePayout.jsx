import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPayoutRequest, approvePayoutRequest, declinePayoutRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import PinConfirm from '../components/PinConfirm';
import { SvcHero, Summary, NoReverseNote, BalanceCheck, useWalletBalance, naira } from '../components/ServiceKit';

const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const STATUS = { SUCCESS: ['Paid', 'ok'], PROCESSING: ['Processing', 'wait'], UNDER_REVIEW: ['Security review', 'wait'], FAILED: ['Failed — refunded', 'no'], REVERSED: ['Reversed — refunded', 'no'], NOT_SENT: ['Not sent', 'no'] };
const HEAD = { AWAITING_APPROVAL: null, PROCESSING: 'Paying now…', DONE: 'Payments sent ✓', PARTIAL: 'Some payments were not sent', FAILED: 'No payment was sent', DECLINED: 'You declined this request', EXPIRED: 'This request expired' };
const receiptPath = (u) => { try { return new URL(u).pathname; } catch { return null; } };

// /approve/:id — a connected app (e.g. StoreWatch) asked for these bank
// payments. Nothing is paid until the owner approves with their PIN.
export default function ApprovePayout() {
  const { id } = useParams();
  const { refreshCustomer } = useAuth();
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, reloadBalance] = useWalletBalance();
  const load = () => getPayoutRequest(id).then((d) => setR(d.request)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function pay(auth) {
    const d = await approvePayoutRequest(id, auth);
    setPinOpen(false);
    setR(d.request);
    reloadBalance();
    refreshCustomer?.();
  }
  async function decline() {
    setErr(''); setBusy(true);
    try { const d = await declinePayoutRequest(id); setR(d.request); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const need = r ? r.totalWithFees : 0;
  const short = balance != null && need > balance;
  const waiting = r?.status === 'AWAITING_APPROVAL';
  const mismatches = r ? r.items.filter((x) => x.nameMismatch).length : 0;

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <SvcHero back="/connected-apps" backLabel="Connected apps" icon="🏦" color="#0D9488" title={r ? r.title : 'Payment request'}
        sub={r ? `${r.app} asked to pay ${r.count} account${r.count === 1 ? '' : 's'} from your wallet.` : 'Loading…'} />
      {err && <p className="error-text" style={{ margin: '0 16px 10px' }}>{err}</p>}
      {!r ? (!err && <p className="empty-state">Loading…</p>) : (
        <>
          {HEAD[r.status] && (
            <div className="card" style={{ fontWeight: 600, color: r.status === 'DONE' ? 'var(--green-500)' : ['FAILED', 'DECLINED', 'EXPIRED'].includes(r.status) ? 'var(--red-500)' : 'var(--gold)' }}>
              {HEAD[r.status]}
              {r.finishedAt && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate-400)' }}>{when(r.finishedAt)}</div>}
            </div>
          )}
          {waiting && mismatches > 0 && (
            <div className="noreverse" role="alert" style={{ margin: '0 16px 12px' }}>
              <b>⚠️ Check {mismatches === 1 ? 'one account name' : `${mismatches} account names`}</b>
              <span>The bank’s name doesn’t match the name {r.app} has saved. Make sure it’s really your supplier before you approve.</span>
            </div>
          )}

          <div className="card">
            {r.items.map((x) => {
              const [label, tone] = x.payment ? STATUS[x.payment.status] || [x.payment.status, 'wait'] : [null];
              const rp = x.payment?.receiptUrl ? receiptPath(x.payment.receiptUrl) : null;
              return (
                <div key={x.index} style={{ padding: '10px 0', borderTop: x.index ? '1px solid var(--slate-700)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ minWidth: 0 }}>{x.label}</b>
                    <b style={{ flexShrink: 0 }}>{naira(x.amount)}</b>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--slate-300)', marginTop: 2 }}>{x.accountName} · {x.bankName || x.bankCode} {x.accountNumber}</div>
                  {x.nameMismatch && <div style={{ fontSize: 12, color: 'var(--gold)' }}>⚠️ {r.app} has this supplier as “{x.expectedName}”</div>}
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Narration: {x.narration} · fee {naira(x.fee)}</div>
                  {x.payment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className={`pill ${tone}`}>{label}</span>
                      {x.payment.error && <span style={{ fontSize: 12, color: 'var(--red-500)' }}>{x.payment.error}</span>}
                      {rp && <Link to={rp} style={{ fontSize: 13 }}>Receipt</Link>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ margin: '0 16px 12px' }}>
            {waiting || !r.items.some((x) => x.payment)
              ? <Summary rows={[['Payments', `${r.count}`], ['Amount', naira(r.total)], ['Transfer fees', naira(r.fees)]]} total={naira(need)} totalLabel={waiting ? 'From your wallet' : 'Requested'} />
              : (() => {
                const sent = r.items.filter((x) => x.payment && !['NOT_SENT', 'FAILED', 'REVERSED'].includes(x.payment.status));
                const amt = sent.reduce((a, x) => a + Number(x.amount), 0);
                const fee = sent.reduce((a, x) => a + Number(x.fee), 0);
                return <Summary rows={[['Sent', `${sent.length} of ${r.count}`], ['Amount', naira(amt)], ['Transfer fees', naira(fee)]]} total={naira(amt + fee)} totalLabel="Taken from your wallet" />;
              })()}
            {waiting && <BalanceCheck balance={balance} need={need} />}
          </div>

          {waiting && (
            <div style={{ margin: '0 16px', display: 'grid', gap: 8 }}>
              <button type="button" className="btn" disabled={short || busy} onClick={() => { setErr(''); setPinOpen(true); }}>Approve and pay {naira(need)}</button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={decline}>Decline</button>
              <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>Expires {when(r.expiresAt)}.</p>
            </div>
          )}
          {!waiting && r.returnUrl && (
            <div style={{ margin: '0 16px' }}>
              <a className="btn btn-secondary" href={r.returnUrl} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to {r.app}</a>
            </div>
          )}
        </>
      )}

      <PinConfirm
        open={pinOpen}
        title="Approve payments"
        summary={r ? `Pay ${r.count} account${r.count === 1 ? '' : 's'} ${naira(r.total)} + ${naira(r.fees)} fees = ${naira(need)} from your wallet.` : ''}
        notice={<NoReverseNote bank />}
        onSubmit={pay}
        onError={(e) => setErr(e.message || 'Could not send the payments.')}
        onClose={() => setPinOpen(false)}
      />
      <BottomNav />
    </div>
  );
}
