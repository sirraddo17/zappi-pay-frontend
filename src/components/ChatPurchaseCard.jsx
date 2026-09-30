import { useState } from 'react';
import { Link } from 'react-router-dom';
import { purchase } from '../api';
import { useAuth } from '../context/AuthContext';
import PinConfirm from './PinConfirm';
import { currentShop } from '../lib/shopRef';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const ICON = { AIRTIME: '📱', DATA: '📶', ELECTRICITY: '⚡', CABLE: '📺', EDUCATION: '🎓', INTERNET: '🌐', BETTING: '🏆' };

// A purchase the help assistant prepared. Nothing is bought until the
// customer taps Pay and confirms with their PIN (same route as the Buy
// screen, so every normal check applies).
export default function ChatPurchaseCard({ draft, onDone, onClose }) {
  const { customer, refreshCustomer } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null); // { ok, order, error, pending }
  const balance = Number(customer?.walletBalance ?? draft.balance);
  const short = balance < draft.total;

  async function pay(auth) {
    const res = await purchase({
      service: draft.service,
      serviceID: draft.serviceID,
      variationCode: draft.variationCode,
      billersCode: draft.billersCode,
      phone: draft.phone,
      amount: draft.amount,
      meterType: draft.meterType,
      repeat: draft.repeat,
      gift: draft.gift,
      shop: currentShop()?.username,
      ...auth,
    });
    setOpen(false);
    refreshCustomer?.().catch(() => {});
    const s = { ok: true, order: res.order, pending: Boolean(res.pending) };
    setState(s);
    onDone?.(s);
    window.dispatchEvent(new Event('zp-refresh'));
  }

  if (state?.ok) {
    return (
      <div style={{ marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid var(--green-500)', fontSize: 13 }}>
        {state.pending ? '⏳ Processing — you’ll get a notification when it’s done.' : '✅ Done!'}{' '}
        {state.order?.id && <Link to={`/orders/${state.order.id}${draft.gift ? '?gift=new' : ''}`} onClick={onClose} style={{ color: 'var(--purple)', fontWeight: 600 }}>{draft.gift ? 'Share the gift card 🎁' : 'View receipt'}</Link>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6, padding: 12, borderRadius: 12, border: '1px solid var(--purple)', background: 'rgba(134,59,255,0.08)' }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 4 }}>Please check before you pay</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{ICON[draft.service]} {draft.summary}</div>
      {draft.gift?.message && <div style={{ fontSize: 12, marginTop: 4 }}>🎁 “{draft.gift.message}”</div>}
      {draft.repeat && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>🔁 Then repeats {draft.repeat.frequency.toLowerCase()} from your wallet — pause any time under Saved & Scheduled.</div>}
      {draft.verifiedName && <div style={{ fontSize: 12, color: 'var(--green-500)', marginTop: 2 }}>✓ {draft.service === 'ELECTRICITY' ? 'Meter name' : 'Name on account'}: {draft.verifiedName}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}><span>Total</span><b>{naira(draft.total)}</b></div>
      {short && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>Your wallet has {naira(balance)}. <Link to="/wallet" onClick={onClose} style={{ color: 'var(--purple)' }}>Fund wallet</Link></div>}
      {state?.error && <div className="error-text" style={{ fontSize: 12, marginTop: 6 }}>{state.error}</div>}
      <button type="button" className="btn" style={{ marginTop: 10, padding: '8px 12px', fontSize: 14 }} disabled={short} onClick={() => setOpen(true)}>Pay {naira(draft.total)}</button>
      <PinConfirm
        open={open}
        summary={`Pay ${naira(draft.total)} · ${draft.summary}`}
        onSubmit={pay}
        onError={(err) => { setOpen(false); setState({ error: err.message || 'Purchase failed.' }); }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
