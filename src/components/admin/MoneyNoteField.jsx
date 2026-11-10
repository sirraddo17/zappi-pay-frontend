import { useState } from 'react';
import { suggestMoneyNote } from '../../api';

// Reason box for a manual wallet credit/debit, with "✨ Suggest note":
// pick what happened, add the order / ticket / bank reference, and get a
// clear note for the audit log (what, why, evidence, who approved).
const REASONS = [
  ['FAILED_ORDER', 'Refund: failed purchase not auto-refunded', 'CREDIT'],
  ['MISSING_FUNDING', 'Bank deposit confirmed but not credited', 'CREDIT'],
  ['GOODWILL', 'Goodwill / apology credit', 'CREDIT'],
  ['REWARD_MISSED', 'Reward that should have been paid', 'CREDIT'],
  ['TEST_REFUND', 'Owner test: money back', 'CREDIT'],
  ['DUPLICATE_CREDIT', 'Reverse a duplicate / wrong credit', 'DEBIT'],
  ['DELIVERED_AFTER_REFUND', 'Order delivered after it was refunded', 'DEBIT'],
  ['TEST_CLEANUP', 'Owner test: clear leftover test money', 'DEBIT'],
  ['CORRECTION', 'Correction of an earlier admin error', 'EITHER'],
];

export default function MoneyNoteField({ customerId, type, amount, value, onChange }) {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);
  const list = REASONS.filter(([, , k]) => k === 'EITHER' || k === type);
  async function suggest() {
    setBusy(true); setHint(null);
    try {
      const looksOrder = /^\d{12}/.test(reference.trim());
      const r = await suggestMoneyNote({ type, amount: Number(amount) || undefined, customerId, reason, ...(reference.trim() ? (looksOrder ? { reference: reference.trim() } : { detail: reference.trim() }) : {}) });
      onChange(r.note);
      setHint({ warnings: r.warnings || [], checklist: r.checklist || [] });
    } catch (e) {
      setHint({ warnings: [e.message], checklist: [] });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="field">
      <label htmlFor="adjustNote">Reason (required — it goes in the wallet history and audit log)</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <select aria-label="What happened" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: '1 1 200px' }}>
          <option value="">What happened?</option>
          {list.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input aria-label="Order reference, ticket or bank session ID" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Order ref, ticket or bank session ID" style={{ flex: '1 1 200px' }} />
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} disabled={busy || !reason} onClick={suggest}>{busy ? '…' : '✨ Suggest note'}</button>
      </div>
      <input id="adjustNote" type="text" maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Refund: failed MTN data ₦1,500 — order 2026… — VTpass confirmed not delivered" required minLength={8} />
      {hint?.warnings?.map((w) => <div key={w} style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>⚠️ {w}</div>)}
      {hint?.checklist?.map((c) => <div key={c} style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>• {c}</div>)}
    </div>
  );
}
