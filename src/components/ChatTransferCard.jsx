import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendTransfer, sendBankTransfer } from '../api';
import { useAuth } from '../context/AuthContext';
import PinConfirm from './PinConfirm';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// A transfer the help assistant prepared. The name shown is the real
// name on the account (checked by the server). Nothing is sent until
// the customer taps Send and enters their PIN, through the same routes
// as the Send Money screen.
export default function ChatTransferCard({ draft, onClose }) {
  const { customer, refreshCustomer } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null);
  const balance = Number(customer?.walletBalance ?? draft.balance);
  const short = balance < draft.total;

  async function send(auth) {
    const res = draft.kind === 'BANK'
      ? await sendBankTransfer({ bankCode: draft.bankCode, accountNumber: draft.accountNumber, amount: draft.amount, narration: draft.narration, ...auth })
      : await sendTransfer({ identifier: draft.identifier, amount: draft.amount, note: draft.note, ...auth });
    setOpen(false);
    refreshCustomer?.().catch(() => {});
    setState({ ok: true, pending: Boolean(res.pending), held: Boolean(res.transfer?.status === 'HELD') });
    window.dispatchEvent(new Event('zp-refresh'));
  }

  if (state?.ok) {
    return (
      <div style={{ marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid var(--green-500)', fontSize: 13 }}>
        {state.held ? '🛡️ Sent for a quick security check — you’ll be notified.' : state.pending ? '⏳ On its way — you’ll get a notification when it lands.' : '✅ Sent!'}{' '}
        <Link to={draft.kind === 'BANK' ? '/transfer' : '/wallet'} onClick={onClose} style={{ color: 'var(--purple)', fontWeight: 600 }}>View</Link>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6, padding: 12, borderRadius: 12, border: '1px solid var(--purple)', background: 'rgba(134,59,255,0.08)' }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 4 }}>Please check before you send</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{naira(draft.amount)}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>
        to <b>{draft.kind === 'BANK' ? draft.accountName : draft.recipientName}</b>
      </div>
      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
        {draft.kind === 'BANK' ? `${draft.bankName} · ${draft.accountNumber}` : `ZAPPI PAY · @${draft.identifier}`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--green-500)', marginTop: 4 }}>✓ Name checked with {draft.kind === 'BANK' ? 'the bank' : 'ZAPPI PAY'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}><span>Fee</span><span>{draft.fee ? naira(draft.fee) : 'Free'}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Total</span><b>{naira(draft.total)}</b></div>
      {short && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>Your wallet has {naira(balance)}. <Link to="/wallet" onClick={onClose} style={{ color: 'var(--purple)' }}>Fund wallet</Link></div>}
      {state?.error && <div className="error-text" style={{ fontSize: 12, marginTop: 6 }}>{state.error}</div>}
      <button type="button" className="btn" style={{ marginTop: 10, padding: '8px 12px', fontSize: 14 }} disabled={short} onClick={() => setOpen(true)}>Send {naira(draft.total)}</button>
      <PinConfirm
        open={open}
        title="Confirm transfer"
        summary={`Send ${naira(draft.amount)} to ${draft.kind === 'BANK' ? `${draft.accountName} (${draft.bankName})` : draft.recipientName}${draft.fee ? ` · fee ${naira(draft.fee)}` : ''}`}
        onSubmit={send}
        onError={(err) => { setOpen(false); setState({ error: err.message || 'Transfer failed.' }); }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
