import { useEffect, useState } from 'react';
import { getCustomerSchedules, setScheduleActive, adminDeleteSchedule, fixCustomerName, setCustomerDailyLimit, grantCustomerReward, openTicketForCustomer } from '../../api';

// Support tools on a customer's page. Everyone: scheduled top-ups (pause)
// and logging a complaint that came by WhatsApp/email/phone as a ticket.
// Owner: resume/delete top-ups, fix the name, their own daily limit,
// and give a reward that didn't arrive.
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const small = { width: 'auto', padding: '4px 10px', fontSize: 12 };
const h3 = { fontSize: 15, margin: '14px 0 6px' };

export default function SupportTools({ customer, isOwner, onDone }) {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState({ channel: 'WhatsApp', message: '' });
  const [name, setName] = useState(customer.name || '');
  const [limit, setLimit] = useState(customer.dailyLimitOverride == null ? '' : String(Number(customer.dailyLimitOverride)));
  const [reward, setReward] = useState({ kind: 'CASHBACK', amount: '', reason: '' });
  const load = () => getCustomerSchedules(customer.id).then((r) => setList(r.schedules)).catch(() => setList([]));
  useEffect(() => { load(); }, [customer.id]);

  async function run(fn, after) {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await fn(); setMsg(r?.message || 'Done.'); after?.(); load(); onDone?.(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const askReason = (q) => { const r = window.prompt(q, ''); return r === null ? null : r.trim(); };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>🧰 Support tools</h2>
      {msg && <p style={{ color: 'var(--green-500)' }}>{msg}</p>}
      {err && <p className="error-text">{err}</p>}

      <h3 style={h3}>Scheduled top-ups</h3>
      {list === null ? <p className="empty-state">Loading…</p> : list.length === 0 ? <p className="empty-state">None.</p> : list.map((s) => (
        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--slate-700)', padding: '4px 0' }}>
          <span>
            {s.nickname ? `${s.nickname} · ` : ''}{s.service.toLowerCase()} {s.serviceID} → {s.billersCode} · {s.amount ? naira(s.amount) : 'plan'} · {s.frequency.toLowerCase()}
            <span style={{ color: 'var(--slate-400)' }}> · {s.active ? `next ${new Date(s.nextRunAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : 'paused'}{s.failCount ? ` · ${s.failCount} failed run${s.failCount === 1 ? '' : 's'}` : ''}{s.lastError ? ` · last error: ${s.lastError}` : ''}</span>
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            {s.active && <button type="button" className="btn btn-secondary" style={small} disabled={busy} onClick={() => run(() => setScheduleActive(s.id, false))}>Pause</button>}
            {!s.active && isOwner && <button type="button" className="btn btn-secondary" style={small} disabled={busy} onClick={() => run(() => setScheduleActive(s.id, true))}>Resume</button>}
            {isOwner && <button type="button" className="btn btn-secondary" style={{ ...small, color: 'var(--red-500)' }} disabled={busy} onClick={() => window.confirm('Delete this scheduled top-up?') && run(() => adminDeleteSchedule(s.id))}>Delete</button>}
          </span>
        </div>
      ))}

      <h3 style={h3}>Log a complaint as a ticket</h3>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 0 }}>For complaints that came by WhatsApp, email or phone, so they're tracked in Support like the rest.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0, flex: '0 0 140px' }}><label htmlFor="tk-c">Came by</label>
          <select id="tk-c" value={ticket.channel} onChange={(e) => setTicket((t) => ({ ...t, channel: e.target.value }))}>{['WhatsApp', 'Email', 'Phone call', 'Instagram', 'X', 'In person', 'Other'].map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="field" style={{ margin: 0, flex: '1 1 260px' }}><label htmlFor="tk-m">What they said</label>
          <input id="tk-m" value={ticket.message} onChange={(e) => setTicket((t) => ({ ...t, message: e.target.value }))} placeholder="e.g. Data of ₦1,000 to 0803… not received yesterday 7pm" />
        </div>
        <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy || ticket.message.trim().length < 10} onClick={() => run(() => openTicketForCustomer(customer.id, ticket).then(() => ({ message: 'Ticket opened — it is in Support now.' })), () => setTicket({ channel: ticket.channel, message: '' }))}>Open ticket</button>
      </div>

      {isOwner && (
        <>
          <h3 style={h3}>Correct their name</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0, flex: '1 1 240px' }}><label htmlFor="nm">Full name (as on their BVN/NIN)</label><input id="nm" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy || name.trim() === customer.name} onClick={() => { const r = askReason('Why? (e.g. "typo — matches BVN slip they sent")'); if (r !== null) run(() => fixCustomerName(customer.id, name, r).then((x) => ({ message: `Name changed. ${x.note}` }))); }}>Save name</button>
          </div>

          <h3 style={h3}>Daily spending limit for this customer</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0, flex: '1 1 200px' }}><label htmlFor="lim">Limit (₦) — empty = the normal limit</label><input id="lim" type="number" min="1000" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="normal limit" /></div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => { const clear = limit.trim() === ''; const r = clear ? '' : askReason('Why? (e.g. "agent buying in bulk, BVN verified")'); if (r !== null) run(() => setCustomerDailyLimit(customer.id, clear ? null : Number(limit), r).then(() => ({ message: clear ? 'Back to the normal limit.' : `Daily limit set to ${naira(limit)}.` }))); }}>Save limit</button>
          </div>

          <h3 style={h3}>Give a reward that didn't arrive</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0, flex: '0 0 170px' }}><label htmlFor="rw-k">Reward</label>
              <select id="rw-k" value={reward.kind} onChange={(e) => setReward((x) => ({ ...x, kind: e.target.value }))}><option value="CASHBACK">Cashback</option><option value="REFERRAL">Referral bonus (to wallet)</option><option value="LOYALTY">Loyalty points</option></select>
            </div>
            <div className="field" style={{ margin: 0, flex: '0 0 120px' }}><label htmlFor="rw-a">{reward.kind === 'LOYALTY' ? 'Points' : 'Amount (₦)'}</label><input id="rw-a" type="number" min="1" value={reward.amount} onChange={(e) => setReward((x) => ({ ...x, amount: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0, flex: '1 1 220px' }}><label htmlFor="rw-r">Why it's owed</label><input id="rw-r" value={reward.reason} onChange={(e) => setReward((x) => ({ ...x, reason: e.target.value }))} placeholder="e.g. friend 0803… met the target, bonus not paid" /></div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy || !(Number(reward.amount) > 0)} onClick={() => run(() => grantCustomerReward(customer.id, reward.kind, Number(reward.amount), reward.reason), () => setReward({ kind: reward.kind, amount: '', reason: '' }))}>Add reward</button>
          </div>
        </>
      )}
    </div>
  );
}
