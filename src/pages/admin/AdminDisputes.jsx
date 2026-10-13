import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminDisputes, resolveDispute, updateBankDispute } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const btn = { width: 'auto', padding: '5px 12px', fontSize: 13 };
const LABEL = {
  AWAITING_RECIPIENT: 'Waiting for recipient', RECIPIENT_DISPUTES: 'Recipient says it’s theirs', RETURNED: 'Returned by recipient', RESOLVED_SENDER: 'Decided: sender', RESOLVED_RECIPIENT: 'Decided: recipient', REVERSED_SYSTEM: 'Reversed (system error)', EXPIRED: 'Hold ended', CANCELLED: 'Withdrawn',
  RECALL_REQUESTED: 'Recall to raise', RECALL_SENT: 'Recall sent to bank', RECOVERED: 'Recovered', NOT_RECOVERED: 'Not recovered',
};

// Admin → Wrong transfers.
export default function AdminDisputes() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('OPEN');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => getAdminDisputes(filter).then((d) => setRows(d.disputes)).catch((e) => setErr(e.message));
  useEffect(() => { setRows(null); load(); }, [filter]);
  async function act(fn, ok) { setErr(''); setMsg(''); try { await fn(); setMsg(ok); load(); } catch (e) { setErr(e.message); } }

  function decide(d, decision) {
    const text = {
      SENDER: `Return the ${naira(d.held)} on hold to ${d.sender.name}? (Only the held amount moves. If it’s less than ${naira(d.amount)}, the recipient is flagged.)`,
      RECIPIENT: `Release the ${naira(d.held)} hold back to ${d.recipient.name}?`,
      SYSTEM_ERROR: `Only for ZAPPI PAY’s own error (duplicate / wrong credit). Reverse up to ${naira(d.amount)} from ${d.recipient.name} without their consent?`,
    }[decision];
    if (!window.confirm(text)) return;
    const note = window.prompt('Note for both customers (optional):') ?? '';
    act(() => resolveDispute(d.id, { decision, note }), 'Done ✓');
  }
  function bank(d, status) {
    let amount;
    if (status === 'RECOVERED') { amount = window.prompt(`Amount recovered (max ${d.amount}):`, String(d.amount)); if (amount === null) return; }
    const note = window.prompt(status === 'RECALL_SENT' ? 'Partner / bank ticket reference (optional):' : 'Note for the customer (optional):') ?? '';
    act(() => updateBankDispute(d.id, { status, note, amount }), 'Updated ✓');
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>↩️ Wrong transfers</h1>
        <p>Money sent to the wrong ZAPPI PAY user or bank account. Follows the CBN rules on erroneous transfers: hold ≤ 14 days, recipient’s consent or a review decision, statement for the police.</p>
      </div>
      <div className="card" style={{ margin: '0 0 16px', fontSize: 13 }}>
        <b>How to decide</b>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          <li><b>Wallet → wallet:</b> the amount still in the recipient’s wallet is on hold. If they don’t return it, look at both sides (reason, chat/receipts, history) and decide <b>before the hold ends</b> — after 14 days it is released to the recipient automatically.</li>
          <li><b>System error</b> (duplicate, wrong amount by ZAPPI PAY): reverse without consent.</li>
          <li><b>To a bank:</b> raise a recall with the payment partner using the reference (Monnify dashboard / support), then record “Recall sent”, “Recovered” (credits the customer) or “Not recovered”.</li>
        </ul>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['OPEN', 'Open'], ['ALL', 'All']].map(([k, l]) => <button key={k} type="button" className={filter === k ? 'btn' : 'btn btn-secondary'} style={btn} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)' }}>{msg}</p>}
      {!rows ? <p className="empty-state">Loading…</p> : !rows.length ? <p className="empty-state">No {filter === 'OPEN' ? 'open ' : ''}wrong-transfer reports.</p> : rows.map((d) => (
        <div key={d.id} className="card" style={{ margin: '0 0 12px', border: d.status === 'RECIPIENT_DISPUTES' || d.status === 'RECALL_REQUESTED' ? '1px solid var(--gold)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{d.kind === 'BANK' ? '🏦' : '👤'} {naira(d.amount)} · {d.sender.name} → {d.recipient.name}{d.kind === 'BANK' ? ` (${d.recipient.bank || ''} ${d.recipient.account || ''})` : d.recipient.username ? ` (@${d.recipient.username})` : ''}</b>
            <span className={`pill ${['RETURNED', 'RESOLVED_SENDER', 'REVERSED_SYSTEM', 'RECOVERED'].includes(d.status) ? 'ok' : ['RESOLVED_RECIPIENT', 'EXPIRED', 'NOT_RECOVERED', 'CANCELLED'].includes(d.status) ? 'no' : 'wait'}`}>{LABEL[d.status] || d.status}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--slate-300)', marginTop: 6, lineHeight: 1.6 }}>
            Sent {when(d.sentAt)} · reported {when(d.createdAt)} · ref <code>{d.reference}</code><br />
            {d.kind === 'WALLET' && <>On hold: <b>{naira(d.held)}</b>{d.daysLeft != null && ['AWAITING_RECIPIENT', 'RECIPIENT_DISPUTES'].includes(d.status) ? ` · ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'} left` : ''}{d.recipientFlagged ? ' · ⚑ recipient flagged before' : ''}<br /></>}
            Sender says: “{d.reason}”
            {d.recipientReply && <><br />Recipient says: “{d.recipientReply}”</>}
            {d.recovered > 0 && <><br />Returned to sender: <b>{naira(d.recovered)}</b></>}
            {d.adminNote && <><br />Note: {d.adminNote}</>}
          </div>
          {d.kind === 'WALLET' && ['AWAITING_RECIPIENT', 'RECIPIENT_DISPUTES'].includes(d.status) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" style={btn} onClick={() => decide(d, 'SENDER')}>Return hold to sender</button>
              <button type="button" className="btn btn-secondary" style={btn} onClick={() => decide(d, 'RECIPIENT')}>Release to recipient</button>
              <button type="button" className="btn btn-secondary" style={{ ...btn, color: 'var(--red-500)' }} onClick={() => decide(d, 'SYSTEM_ERROR')}>System error: reverse</button>
            </div>
          )}
          {d.kind === 'BANK' && ['RECALL_REQUESTED', 'RECALL_SENT'].includes(d.status) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {d.status === 'RECALL_REQUESTED' && <button type="button" className="btn" style={btn} onClick={() => bank(d, 'RECALL_SENT')}>Recall sent to partner</button>}
              <button type="button" className="btn btn-secondary" style={btn} onClick={() => bank(d, 'RECOVERED')}>Recovered</button>
              <button type="button" className="btn btn-secondary" style={btn} onClick={() => bank(d, 'NOT_RECOVERED')}>Not recovered</button>
            </div>
          )}
        </div>
      ))}
    </AdminLayout>
  );
}
