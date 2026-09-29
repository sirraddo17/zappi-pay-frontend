import { useState } from 'react';
import { createEscalation, setCustomerActive } from '../../api';

const TYPES = [
  ['PASSWORD_RESET', 'Reset their password'],
  ['ORDER_REFUND', 'Refund a purchase that wasn’t delivered'],
  ['WALLET_CREDIT', 'Credit their wallet'],
  ['WALLET_DEBIT', 'Debit their wallet'],
  ['SECURITY_RESET', 'Reset date of birth & security question'],
  ['REACTIVATE', 'Reactivate their account'],
  ['OTHER', 'Something else'],
];
const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

// Support staff: send a sensitive action to an owner for approval.
// The customer is told automatically and given a time frame.
export default function RequestApproval({ customer, orders, onDone }) {
  const [type, setType] = useState('PASSWORD_RESET');
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [idOk, setIdOk] = useState(false);
  const [debitOk, setDebitOk] = useState(false);
  const [checkNote, setCheckNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const pending = orders.filter((o) => o.status === 'PENDING');
  const needsOrder = type === 'ORDER_REFUND';
  const needsAmount = type === 'WALLET_CREDIT' || type === 'WALLET_DEBIT';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await createEscalation({ type, customerId: customer.id, orderId: orderId || undefined, amount: needsAmount ? Number(amount) : undefined, reason, identityVerified: idOk, debitConfirmed: debitOk, checkNote });
      if (r.resolved) setMsg(r.message);
      else setMsg(`Sent for approval (${r.escalation.ref}). ${customer.name.split(' ')[0]} has been told it's with a senior admin.`);
      setReason('');
      setAmount('');
      setCheckNote('');
      onDone?.();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function freeze() {
    if (!window.confirm(`Freeze ${customer.name}'s account now? They won't be able to log in or spend until an admin reactivates it.`)) return;
    try {
      await setCustomerActive(customer.id, false);
      setMsg('Account frozen. Ask an admin to reactivate it when it’s safe.');
      onDone?.();
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <form className="card" style={{ margin: '0 0 16px', border: '1px solid var(--purple)' }} onSubmit={submit}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>📨 Request admin approval</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -6 }}>Passwords, refunds and wallet changes need an owner. Check it’s really the customer first (panel above). The customer is told it’s being reviewed and when to expect an answer.</p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 8px' }}>{msg}</p>}
      <div className="field">
        <label htmlFor="ra-type">What needs approval?</label>
        <select id="ra-type" value={type} onChange={(e) => { setType(e.target.value); setOrderId(''); }}>
          {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {(needsOrder || type === 'WALLET_CREDIT') && (
        <div className="field">
          <label htmlFor="ra-order">{needsOrder ? 'Which purchase?' : 'About a purchase? (optional)'}</label>
          <select id="ra-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} required={needsOrder}>
            <option value="">{needsOrder ? (pending.length ? 'Choose…' : 'No pending purchases') : 'None'}</option>
            {(needsOrder ? pending : orders.slice(0, 30)).map((o) => (
              <option key={o.id} value={o.id}>{o.service.toLowerCase()} {naira(o.amount)} · {o.recipient} · {new Date(o.createdAt).toLocaleDateString('en-NG')} · {o.status}</option>
            ))}
          </select>
          {needsOrder && <small style={{ color: 'var(--slate-400)' }}>We ask VTpass first — if they confirm it failed, the customer is refunded automatically and no approval is needed. Delivered-but-not-received? Use “Report to VTpass” on the Orders page.</small>}
        </div>
      )}
      {needsAmount && (
        <div className="field">
          <label htmlFor="ra-amt">Amount (₦)</label>
          <input id="ra-amt" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
      )}
      <div className="field">
        <label htmlFor="ra-reason">What happened and what did you check?</label>
        <textarea id="ra-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required placeholder="e.g. Customer bought ₦2,000 IBEDC at 9:15am, wallet debited, no token. VTpass still pending after 3 hours." style={{ width: '100%', boxSizing: 'border-box' }} />
      </div>
      <label style={{ display: 'flex', gap: 8, fontSize: 14, marginBottom: 6 }}>
        <input type="checkbox" checked={idOk} onChange={(e) => setIdOk(e.target.checked)} style={{ width: 'auto' }} /> I confirmed it’s really the customer (date of birth / security question / registered number)
      </label>
      {(needsOrder || type === 'WALLET_CREDIT') && (
        <label style={{ display: 'flex', gap: 8, fontSize: 14, marginBottom: 6 }}>
          <input type="checkbox" checked={debitOk} onChange={(e) => setDebitOk(e.target.checked)} style={{ width: 'auto' }} /> I confirmed the wallet was debited and the service wasn’t delivered (order + wallet history below)
        </label>
      )}
      <div className="field">
        <input aria-label="Extra check notes" value={checkNote} onChange={(e) => setCheckNote(e.target.value)} maxLength={300} placeholder="Extra checks (optional), e.g. saw bank alert screenshot" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</button>
        {customer.active && <button type="button" className="btn btn-secondary" style={{ width: 'auto', color: 'var(--red-500)' }} onClick={freeze}>Freeze account now</button>}
      </div>
    </form>
  );
}
