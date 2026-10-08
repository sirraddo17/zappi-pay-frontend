import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import {
  getPartnerDesk, getPartnerIssues, savePartnerContact, deletePartnerContact, addPartnerTask, updatePartnerTask, deletePartnerTask,
  makeVtpassDraft, runPartnerCheck, getPartnerReport, setAutoPause, resumeProvider, setAwayMode, sendFollowUp, dismissFollowUp, checkCustomerFunding,
} from '../../api';

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;
const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
const btn = { width: 'auto', padding: '5px 12px', fontSize: 13 };
const small = { fontSize: 13, color: 'var(--slate-400)' };
const card = { margin: '0 0 16px' };
const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const line = { borderTop: '1px solid var(--slate-800)', padding: '8px 0', fontSize: 14 };
const lastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function EmailDraft({ draft, onClose }) {
  const [body, setBody] = useState(draft.body);
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${encodeURIComponent(draft.to || '')}?subject=${encodeURIComponent(draft.subject || '')}&body=${encodeURIComponent(body.slice(0, 1800))}`;
  return (
    <div role="dialog" aria-label="Email draft" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: 'min(640px, 100%)', maxHeight: '100%', overflow: 'auto', margin: 0 }}>
        <b>✉️ Email draft — you send it</b>
        <div style={{ ...small, margin: '6px 0' }}>To: <b style={{ color: 'inherit' }}>{draft.to || '(add the partner’s email under Contacts)'}</b><br />Subject: <b style={{ color: 'inherit' }}>{draft.subject}</b></div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13 }} aria-label="Email text" />
        <div style={{ ...row, marginTop: 8 }}>
          <a className="btn" style={{ ...btn, textDecoration: 'none' }} href={mailto}>Open in my email app</a>
          <button type="button" className="btn btn-secondary" style={btn} onClick={() => navigator.clipboard?.writeText(`${draft.subject}\n\n${body}`).then(() => setCopied(true)).catch(() => {})}>{copied ? 'Copied ✓' : 'Copy text'}</button>
          <button type="button" className="btn btn-secondary" style={btn} onClick={onClose}>Close</button>
        </div>
        <p style={{ ...small, margin: '8px 0 0' }}>Send it from your business email (sirraddoventures@gmail.com) so the partner can match it to your account.</p>
      </div>
    </div>
  );
}

function Contact({ p, onSaved, onDeleted }) {
  const [f, setF] = useState({ name: p.name || '', email: p.email || '', phone: p.phone || '', website: p.website || '', accountRef: p.accountRef || '', notes: p.notes || '' });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    try { await savePartnerContact(p.key, f); setOpen(false); onSaved(); } catch (e) { setErr(e.message); }
  }
  if (!open) {
    return (
      <div style={line}>
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <b>{p.name}</b>
          <button type="button" className="btn btn-secondary" style={btn} onClick={() => setOpen(true)}>Edit</button>
        </div>
        <div style={small}>
          {p.email && <>✉️ <a href={`mailto:${p.email}`} style={{ color: 'var(--purple)' }}>{p.email}</a> · </>}
          {p.phone && <>📞 <a href={`tel:${p.phone}`} style={{ color: 'var(--purple)' }}>{p.phone}</a> · </>}
          {p.website && <a href={p.website} target="_blank" rel="noreferrer" style={{ color: 'var(--purple)' }}>{p.website.replace(/^https?:\/\//, '')}</a>}
          {p.accountRef && <> · Account: {p.accountRef}</>}
        </div>
        {p.notes && <div style={{ ...small, marginTop: 2 }}>{p.notes}</div>}
      </div>
    );
  }
  const inp = (k, label, type = 'text') => <label key={k} style={{ display: 'grid', gap: 2, fontSize: 13, flex: '1 1 180px' }}>{label}<input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>;
  return (
    <div style={line}>
      <div style={{ ...row, alignItems: 'flex-end' }}>{inp('name', 'Name')}{inp('email', 'Email', 'email')}{inp('phone', 'Phone')}{inp('website', 'Website')}{inp('accountRef', 'Our account / merchant ID (not a password)')}</div>
      <label style={{ display: 'grid', gap: 2, fontSize: 13, marginTop: 6 }}>Notes<textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ fontFamily: 'inherit' }} /></label>
      {err && <p className="error-text">{err}</p>}
      <div style={{ ...row, marginTop: 6 }}>
        <button type="button" className="btn" style={btn} onClick={save}>Save</button>
        <button type="button" className="btn btn-secondary" style={btn} onClick={() => setOpen(false)}>Cancel</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-secondary" style={{ ...btn, color: 'var(--red-500)' }} onClick={() => { if (window.confirm(`Remove ${p.name} and its deadlines?`)) deletePartnerContact(p.key).then(onDeleted).catch((e) => setErr(e.message)); }}>Remove</button>
      </div>
    </div>
  );
}

function FollowUp({ f, onDone }) {
  const [text, setText] = useState(f.message);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go(kind) {
    if (kind === 'send' && !window.confirm(`Send this to ${f.customers} customer${f.customers === 1 ? '' : 's'}?`)) return;
    setBusy(true); setErr('');
    try { await (kind === 'send' ? sendFollowUp(f.id, text) : dismissFollowUp(f.id)); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div style={line}>
      <b>{f.title}</b> <span style={small}>· {f.customers} customer{f.customers === 1 ? '' : 's'} · {when(f.createdAt)}</span>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', marginTop: 6 }} aria-label="Follow-up message" />
      {err && <p className="error-text">{err}</p>}
      <div style={{ ...row, marginTop: 4 }}>
        <button type="button" className="btn" style={btn} disabled={busy} onClick={() => go('send')}>Send to {f.customers}</button>
        <button type="button" className="btn btn-secondary" style={btn} disabled={busy} onClick={() => go('dismiss')}>Don’t send</button>
      </div>
    </div>
  );
}

export default function AdminPartners() {
  const [d, setD] = useState(null);
  const [iss, setIss] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState(null);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState('');
  const [rep, setRep] = useState(null);
  const [month, setMonth] = useState(lastMonth());
  const [task, setTask] = useState({ partnerKey: 'vtpass', title: '', dueAt: '' });
  const [newP, setNewP] = useState({ key: '', name: '', email: '' });
  const [awayDraft, setAwayDraft] = useState(null);

  const load = () => getPartnerDesk().then((x) => { setD(x); setAwayDraft(x.away); }).catch((e) => setErr(e.message));
  const loadIssues = () => getPartnerIssues().then(setIss).catch((e) => setErr(e.message));
  useEffect(() => { load(); loadIssues(); }, []);

  async function act(name, fn, ok) {
    setBusy(name); setErr(''); setMsg('');
    try { const r = await fn(); if (ok) setMsg(typeof ok === 'function' ? ok(r) : ok); await load(); return r; } catch (e) { setErr(e.message); return null; } finally { setBusy(''); }
  }

  const picked = Object.keys(pick).filter((k) => pick[k]);
  const drafts = (d?.followUps || []).filter((f) => f.status === 'DRAFT');
  const openTasks = (d?.tasks || []).filter((t) => !t.done);
  const overdue = openTasks.filter((t) => new Date(t.dueAt) < new Date());
  const rc = d?.lastReconcile;

  return (
    <AdminLayout>
      <h1 style={{ marginTop: 0 }}>🤝 Partners</h1>
      <p style={{ ...small, fontSize: 14, marginTop: -6 }}>VTpass, Monnify, ClubKonnect and others in one place — plus what the app does by itself while you’re away. The app drafts; <b>you</b> send emails and approve messages.</p>
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 14 }}>{msg}</p>}
      {!d ? <p>Loading…</p> : (
        <>
          <div style={{ ...row, marginBottom: 14 }}>
            {[
              [`🚦 ${d.autoPause.paused.length} paused`, d.autoPause.paused.length ? 'var(--gold)' : 'var(--green-500)'],
              [`🌙 ${d.away.awayNow ? 'Away now' : d.away.mode === 'OFF' ? 'Away mode off' : 'Online'}`, d.away.awayNow ? 'var(--purple)' : 'var(--slate-400)'],
              [`💌 ${drafts.length} to approve`, drafts.length ? 'var(--gold)' : 'var(--slate-400)'],
              [`🧾 ${iss ? iss.vtpass.length + iss.monnify.length : '…'} to raise`, iss && iss.vtpass.length + iss.monnify.length ? 'var(--gold)' : 'var(--slate-400)'],
              [`📅 ${overdue.length ? `${overdue.length} overdue` : `${openTasks.length} deadlines`}`, overdue.length ? 'var(--red-500)' : 'var(--slate-400)'],
            ].map(([t, c]) => <span key={t} style={{ border: `1px solid ${c}`, color: c, borderRadius: 999, padding: '3px 10px', fontSize: 13 }}>{t}</span>)}
          </div>

          {drafts.length > 0 && (
            <div className="card" style={{ ...card, border: '1px solid var(--gold)' }}>
              <b>💌 Messages for customers — waiting for you</b>
              <p style={{ ...small, margin: '4px 0 0' }}>Written after an outage. Edit if you like, then send — or don’t.</p>
              {drafts.map((f) => <FollowUp key={f.id} f={f} onDone={() => { setMsg('Done.'); load(); }} />)}
            </div>
          )}

          <div className="card" style={card}>
            <div style={{ ...row, justifyContent: 'space-between' }}>
              <b>🚦 Auto-pause when a partner is failing</b>
              <label style={{ ...row, fontSize: 14 }}><input type="checkbox" checked={d.autoPause.enabled} onChange={(e) => act('ap', () => setAutoPause(e.target.checked), e.target.checked ? 'Auto-pause is on.' : 'Auto-pause is off.')} style={{ width: 'auto' }} /> On</label>
            </div>
            <p style={{ ...small, margin: '4px 0 6px' }}>If one provider (e.g. IKEDC or MTN data) fails {d.autoPause.rule.failures}+ times for {d.autoPause.rule.customers}+ different customers within {d.autoPause.rule.minutes} minutes, the app pauses only that provider, shows customers a polite notice, tries again after 15 minutes (longer if it’s still failing) and reopens it by itself. Everyone is refunded automatically as usual. You get a message when it pauses and when it’s back.</p>
            {d.autoPause.paused.length === 0 ? <div style={{ ...small, color: 'var(--green-500)' }}>✅ Everything is open.</div> : d.autoPause.paused.map((p) => (
              <div key={p.provider} style={{ ...line, ...row, justifyContent: 'space-between' }}>
                <span><b>{p.name}</b> · {p.state === 'TRIAL' ? '🟡 being tried again' : `⛔ paused until ${when(p.until)}`}<br /><span style={small}>{p.reason} · since {when(p.since)} · {p.customers} customer(s) affected</span></span>
                <button type="button" className="btn btn-secondary" style={btn} disabled={busy === p.provider} onClick={() => act(p.provider, () => resumeProvider(p.provider), `${p.name} reopened.`)}>Reopen now</button>
              </div>
            ))}
          </div>

          <div className="card" style={card}>
            <b>🌙 Away mode — support while you sleep</b>
            <p style={{ ...small, margin: '4px 0 8px' }}>While you’re away, each new support message gets an instant, safe reply. Messages about an order get the real status (the app checks VTpass first). Money, refund and account questions only get “a person will check, your money is safe”. Simple how-to questions can get an AI answer from the official guide. Every ticket stays open for you to answer properly.</p>
            {awayDraft && (
              <div style={{ ...row, alignItems: 'flex-end' }}>
                <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>When
                  <select value={awayDraft.mode} onChange={(e) => setAwayDraft({ ...awayDraft, mode: e.target.value })} style={{ width: 'auto' }}>
                    <option value="OFF">Off</option><option value="HOURS">Every night (set hours)</option><option value="ON">Away now (until I switch it off)</option>
                  </select>
                </label>
                {awayDraft.mode === 'HOURS' && <>
                  <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>From<input type="time" value={awayDraft.from} onChange={(e) => setAwayDraft({ ...awayDraft, from: e.target.value })} style={{ width: 'auto' }} /></label>
                  <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>To<input type="time" value={awayDraft.to} onChange={(e) => setAwayDraft({ ...awayDraft, to: e.target.value })} style={{ width: 'auto' }} /></label>
                </>}
                <label style={{ ...row, fontSize: 13 }}><input type="checkbox" checked={awayDraft.aiReplies} onChange={(e) => setAwayDraft({ ...awayDraft, aiReplies: e.target.checked })} style={{ width: 'auto' }} /> AI answers simple how-to questions</label>
                <button type="button" className="btn" style={btn} disabled={busy === 'away'} onClick={() => act('away', () => setAwayMode(awayDraft), 'Away mode saved.')}>Save</button>
              </div>
            )}
            <div style={{ ...small, marginTop: 6 }}>Now: {d.away.awayNow ? '🌙 away — new messages get automatic replies' : '🟢 you’re “online” — no automatic replies'}{awayDraft?.aiReplies && !d.away.customerAiOn ? <> · AI answers need the customer AI on in <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>Settings → AI Assistant</Link> (holding replies still work)</> : ''}</div>
          </div>

          <div className="card" style={card}>
            <div style={{ ...row, justifyContent: 'space-between' }}><b>🧾 To raise with partners</b><button type="button" className="btn btn-secondary" style={btn} onClick={loadIssues}>Refresh</button></div>
            {!iss ? <p style={small}>Loading…</p> : (
              <>
                <div style={{ marginTop: 8 }}><b style={{ fontSize: 14 }}>VTpass</b> <span style={small}>— orders to confirm with VTpass</span></div>
                {iss.vtpass.length === 0 ? <div style={{ ...small, color: 'var(--green-500)' }}>✅ Nothing waiting.</div> : (
                  <>
                    {iss.vtpass.map((o) => (
                      <label key={o.id} style={{ ...line, display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(pick[o.id])} onChange={(e) => setPick({ ...pick, [o.id]: e.target.checked })} style={{ width: 'auto', marginTop: 3 }} />
                        <span><b>{o.service}</b> · {o.provider} · {o.recipient} · {naira(o.amount)} · {when(o.createdAt)}<br /><span style={small}>{o.why}{o.escalatedAt ? ` · reported ${when(o.escalatedAt)}` : ''} · ID {o.requestId}</span></span>
                      </label>
                    ))}
                    <div style={{ ...row, marginTop: 6 }}>
                      <button type="button" className="btn" style={btn} disabled={!picked.length || busy === 'draft'} onClick={async () => { const r = await act('draft', () => makeVtpassDraft(picked)); if (r) setDraft(r); }}>✉️ Draft one email for {picked.length || 'the ticked'} order{picked.length === 1 ? '' : 's'}</button>
                      <button type="button" className="btn btn-secondary" style={btn} onClick={() => setPick(Object.fromEntries(iss.vtpass.map((o) => [o.id, true])))}>Tick all</button>
                    </div>
                  </>
                )}
                <div style={{ marginTop: 14 }}><b style={{ fontSize: 14 }}>Monnify</b> <span style={small}>— customers saying a transfer hasn’t reflected</span></div>
                {iss.monnify.length === 0 ? <div style={{ ...small, color: 'var(--green-500)' }}>✅ Nothing waiting.</div> : iss.monnify.map((t) => (
                  <div key={t.ticketId} style={{ ...line, ...row, justifyContent: 'space-between' }}>
                    <span><b>{t.customer || 'Customer'}</b> {t.phone ? `· ${t.phone}` : ''} · {when(t.createdAt)}<br /><span style={small}>“{t.message}”</span></span>
                    {t.hasAccount
                      ? <button type="button" className="btn btn-secondary" style={btn} disabled={busy === t.ticketId} onClick={() => act(t.ticketId, () => checkCustomerFunding(t.customerId), (r) => r?.message || 'Checked.')}>Check with Monnify</button>
                      : <span style={small}>No reserved account</span>}
                  </div>
                ))}
                <div style={{ marginTop: 14, fontSize: 14 }}><b>ClubKonnect</b> — {iss.clubkonnect ? (iss.clubkonnect.balance !== null && iss.clubkonnect.balance !== undefined ? <span style={{ color: iss.clubkonnect.low ? 'var(--gold)' : 'inherit' }}>wallet {naira(iss.clubkonnect.balance)}{iss.clubkonnect.low ? ' — low, fund it so cards and bet funding don’t fail' : ''}</span> : <span style={small}>couldn’t read the balance ({iss.clubkonnect.error || 'unknown'})</span>) : <span style={small}>not set up</span>}</div>
              </>
            )}
          </div>

          <div className="card" style={card}>
            <div style={{ ...row, justifyContent: 'space-between' }}>
              <b>🔁 Weekly partner check</b>
              <button type="button" className="btn btn-secondary" style={btn} disabled={busy === 'rc'} onClick={() => act('rc', runPartnerCheck, 'Check finished.')}>{busy === 'rc' ? 'Checking… (about a minute)' : 'Run now'}</button>
            </div>
            <p style={{ ...small, margin: '4px 0 6px' }}>Every Monday morning the app re-asks VTpass about uncertain orders, looks for bank transfers Monnify never told us about (and credits them), and reads the ClubKonnect wallet. You get a message with anything to raise.</p>
            {!rc ? <div style={small}>Not run yet.</div> : (
              <div style={{ fontSize: 14 }}>
                <div style={small}>Last run {when(rc.ranAt)}</div>
                <div>VTpass: {rc.vtpass?.checked || 0} checked · {rc.vtpass?.settled || 0} stuck settled · <b style={{ color: rc.vtpass?.mismatches?.length ? 'var(--gold)' : 'inherit' }}>{rc.vtpass?.mismatches?.length || 0} mismatch(es)</b></div>
                {(rc.vtpass?.mismatches || []).map((m) => <div key={m.id} style={{ ...small, paddingLeft: 10 }}>• {m.service} {m.provider} · {m.recipient} · {naira(m.amount)} · ID {m.requestId} — {m.issue}</div>)}
                {rc.vtpass?.mismatches?.length > 0 && <button type="button" className="btn btn-secondary" style={{ ...btn, marginTop: 4 }} onClick={async () => { const r = await act('draft', () => makeVtpassDraft(rc.vtpass.mismatches.map((m) => m.id))); if (r) setDraft(r); }}>✉️ Draft email to VTpass about these</button>}
                <div>Monnify: {rc.monnify?.error ? <span style={small}>{rc.monnify.error}</span> : <>{rc.monnify?.checked || 0} accounts checked · {rc.monnify?.credited || 0} missed transfer(s) credited {rc.monnify?.amount ? `(${naira(rc.monnify.amount)})` : ''}</>}</div>
                <div>ClubKonnect: {rc.clubkonnect?.balance !== null && rc.clubkonnect?.balance !== undefined ? naira(rc.clubkonnect.balance) : <span style={small}>not checked</span>}</div>
              </div>
            )}
          </div>

          <div className="card" style={card}>
            <b>📊 Monthly partner report</b>
            <p style={{ ...small, margin: '4px 0 6px' }}>Show partners you’re growing — it builds trust and helps when you ask for better rates, sub-accounts or approvals.</p>
            <div style={row}>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 'auto' }} aria-label="Month" />
              <button type="button" className="btn btn-secondary" style={btn} disabled={busy === 'rep'} onClick={async () => { const r = await act('rep', () => getPartnerReport(month)); if (r) setRep(r); }}>Make report</button>
            </div>
            {rep && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <b>{rep.label}</b>: {rep.stats.success.toLocaleString()} successful of {rep.stats.orders.toLocaleString()} ({rep.stats.successRate}%) · {naira(rep.stats.value)} delivered · {rep.stats.funding.count} fundings ({naira(rep.stats.funding.value)}) · {rep.stats.newCustomers} new customers
                {rep.growth.value !== null && <span style={{ color: rep.growth.value >= 0 ? 'var(--green-500)' : 'var(--red-500)' }}> · {rep.growth.value >= 0 ? '▲' : '▼'} {Math.abs(rep.growth.value)}% value vs last month</span>}
                <div style={{ ...row, marginTop: 6 }}>
                  <button type="button" className="btn" style={btn} onClick={() => setDraft({ to: d.partners.find((p) => p.key === 'vtpass')?.email, subject: `Monthly summary — Sirraddo Venture (ZAPPI PAY) — ${rep.label}`, body: rep.drafts.vtpass })}>✉️ Email for VTpass</button>
                  <button type="button" className="btn" style={btn} onClick={() => setDraft({ to: d.partners.find((p) => p.key === 'monnify')?.email, subject: `Monthly summary — Sirraddo Venture (ZAPPI PAY) — ${rep.label}`, body: rep.drafts.monnify })}>✉️ Email for Monnify</button>
                </div>
                {rep.stats.orders === 0 && <p style={small}>No orders that month yet — send it once you have real volume.</p>}
              </div>
            )}
          </div>

          <div className="card" style={card}>
            <b>📅 Deadlines & follow-ups</b>
            <p style={{ ...small, margin: '4px 0 6px' }}>You get a reminder a day before (and when it’s overdue).</p>
            <form style={{ ...row, alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); act('task', () => addPartnerTask({ ...task, dueAt: new Date(task.dueAt).toISOString() }), 'Deadline added.').then((r) => r && setTask({ ...task, title: '', dueAt: '' })); }}>
              <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>Partner<select value={task.partnerKey} onChange={(e) => setTask({ ...task, partnerKey: e.target.value })} style={{ width: 'auto' }}>{d.partners.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}<option value="other">Other</option></select></label>
              <label style={{ display: 'grid', gap: 2, fontSize: 13, flex: '1 1 220px' }}>What<input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="e.g. Follow up on sub-accounts" required /></label>
              <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>When<input type="datetime-local" value={task.dueAt} onChange={(e) => setTask({ ...task, dueAt: e.target.value })} required style={{ width: 'auto' }} /></label>
              <button type="submit" className="btn" style={btn}>Add</button>
            </form>
            {(d.tasks || []).length === 0 && <div style={{ ...small, marginTop: 6 }}>No deadlines yet. Ideas: “Monnify — follow up on sub-accounts”, “VTpass — SLA renews (12 Sept 2027, give 30 days’ notice to change)”.</div>}
            {(d.tasks || []).map((t) => {
              const late = !t.done && new Date(t.dueAt) < new Date();
              return (
                <div key={t.id} style={{ ...line, ...row, justifyContent: 'space-between', opacity: t.done ? 0.55 : 1 }}>
                  <label style={{ ...row, cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.done} onChange={(e) => act(`t${t.id}`, () => updatePartnerTask(t.id, { done: e.target.checked }))} style={{ width: 'auto' }} />
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}><b>{t.title}</b> <span style={{ ...small, color: late ? 'var(--red-500)' : small.color }}>· {d.partners.find((p) => p.key === t.partnerKey)?.name || t.partnerKey} · {late ? 'overdue — ' : ''}{when(t.dueAt)}</span></span>
                  </label>
                  <button type="button" className="btn btn-secondary" style={btn} onClick={() => act(`t${t.id}`, () => deletePartnerTask(t.id))} aria-label="Delete deadline">✕</button>
                </div>
              );
            })}
          </div>

          <div className="card" style={card}>
            <b>📇 Partner contacts</b>
            <p style={{ ...small, margin: '4px 0 0' }}>Keep their support emails and phone numbers here. Never store passwords or API keys here — keys go in Settings.</p>
            {d.partners.map((p) => <Contact key={p.key} p={p} onSaved={() => { setMsg('Saved.'); load(); }} onDeleted={() => { setMsg('Removed.'); load(); }} />)}
            <form style={{ ...row, alignItems: 'flex-end', marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); act('np', () => savePartnerContact(newP.key || newP.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), newP), 'Partner added.').then((r) => r && setNewP({ key: '', name: '', email: '' })); }}>
              <label style={{ display: 'grid', gap: 2, fontSize: 13, flex: '1 1 160px' }}>New partner<input value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} placeholder="e.g. Anchor" required /></label>
              <label style={{ display: 'grid', gap: 2, fontSize: 13, flex: '1 1 200px' }}>Email<input type="email" value={newP.email} onChange={(e) => setNewP({ ...newP, email: e.target.value })} placeholder="hello@…" /></label>
              <button type="submit" className="btn btn-secondary" style={btn}>＋ Add</button>
            </form>
          </div>
        </>
      )}
      {draft && <EmailDraft draft={draft} onClose={() => setDraft(null)} />}
    </AdminLayout>
  );
}
