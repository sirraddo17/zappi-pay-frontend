import { useEffect, useState } from 'react';
import { getCardPayments, recheckCardPayment, chargebackCardPayment, recordManualPayout } from '../../api';

// Owner money tools on a customer's page:
//  • Card payments — "Check again" when the card was charged but the wallet
//    wasn't credited; "Chargeback" when the card owner's bank took it back.
//  • Manual payout — record money you sent to their bank yourself.
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const COLOR = { PAID: 'var(--green-500)', PENDING: 'var(--gold)', FAILED: 'var(--slate-400)', CHARGEBACK: 'var(--red-500)' };
const small = { width: 'auto', padding: '4px 10px', fontSize: 12 };

export default function MoneyTools({ customer, onDone }) {
  const [cards, setCards] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ amount: '', bankName: '', accountNumber: '', accountName: '', reference: '', note: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const loadCards = () => getCardPayments(customer.id).then((r) => setCards(r.payments)).catch(() => setCards([]));
  useEffect(() => { loadCards(); }, [customer.id]);

  async function run(fn) {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await fn(); setMsg(r?.message || 'Done.'); loadCards(); onDone?.(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const chargeback = (p) => {
    const note = window.prompt(`Record a chargeback on ${naira(p.amount)} (${p.txRef})?\n\nWhat's left of it in the wallet is taken back, and the account is frozen and signed out until you sort it out.\n\nNote (e.g. Flutterwave chargeback reference):`, '');
    if (note !== null) run(() => chargebackCardPayment(p.txRef, note));
  };
  const payout = (e) => {
    e.preventDefault();
    if (!window.confirm(`Record that you sent ${naira(f.amount)} to ${f.bankName} ${f.accountNumber} (${f.accountName})? This takes it off ${customer.name}'s wallet.`)) return;
    run(async () => { const r = await recordManualPayout(customer.id, { ...f, amount: Number(f.amount) }); setF({ amount: '', bankName: '', accountNumber: '', accountName: '', reference: '', note: '' }); return r; });
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>💳 Money tools</h2>
      {msg && <p style={{ color: 'var(--green-500)' }}>{msg}</p>}
      {err && <p className="error-text">{err}</p>}

      <h3 style={{ fontSize: 15, margin: '6px 0' }}>Card payments</h3>
      {cards === null ? <p className="empty-state">Loading…</p> : cards.length === 0 ? <p className="empty-state">No card payments.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cards.slice(0, 15).map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--slate-700)', paddingBottom: 6 }}>
              <span>{naira(p.amount)} · {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} · <span style={{ color: COLOR[p.status] }}>{p.status === 'CHARGEBACK' ? 'CHARGED BACK' : p.status}</span> <span style={{ color: 'var(--slate-400)' }}>{p.txRef}</span></span>
              <span style={{ display: 'flex', gap: 6 }}>
                {(p.status === 'PENDING' || p.status === 'FAILED') && <button type="button" className="btn btn-secondary" style={small} disabled={busy} onClick={() => run(() => recheckCardPayment(p.txRef))}>Check again</button>}
                {p.status === 'PAID' && <button type="button" className="btn btn-secondary" style={{ ...small, color: 'var(--red-500)' }} disabled={busy} onClick={() => chargeback(p)}>Chargeback</button>}
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>“Check again” asks Flutterwave and credits only if it says the payment succeeded (never twice). Use “Chargeback” when Flutterwave tells you the card owner disputed it.</p>

      <h3 style={{ fontSize: 15, margin: '14px 0 6px' }}>Record a manual payout</h3>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 0 }}>Send the money yourself first (your bank app or partner dashboard), then record it here. It comes off their wallet ({naira(customer.walletBalance)} now) with the bank details and reference, and they're told.</p>
      <form onSubmit={payout} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-a">Amount sent (₦)</label><input id="mp-a" type="number" min="1" value={f.amount} onChange={set('amount')} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-b">Bank</label><input id="mp-b" value={f.bankName} onChange={set('bankName')} placeholder="e.g. GTBank" /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-n">Account number</label><input id="mp-n" inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={set('accountNumber')} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-nm">Account name</label><input id="mp-nm" value={f.accountName} onChange={set('accountName')} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-r">Transfer reference / session ID</label><input id="mp-r" value={f.reference} onChange={set('reference')} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="mp-no">Note (optional)</label><input id="mp-no" value={f.note} onChange={set('note')} placeholder="e.g. closing account" /></div>
        <div style={{ alignSelf: 'end' }}><button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || !(Number(f.amount) > 0)}>Record payout</button></div>
      </form>
    </div>
  );
}
