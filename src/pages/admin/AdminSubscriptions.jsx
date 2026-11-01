import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getSubscriptions, saveSubscriptions } from '../../api';

// Admin → 🧾 Subscriptions: every plan and package the app runs on, what
// it costs and when it renews. Owner only. Reminders are sent by the
// server 14, 7, 3, 1 and 0 days before each renewal date.
const money = (amount, currency) => (amount === '' || amount === undefined ? '—' : `${currency === 'USD' ? '$' : '₦'}${Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`);
const date = (ymd) => (ymd ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—');
const DUE_COLOR = { overdue: 'var(--red-500)', urgent: 'var(--red-500)', soon: 'var(--gold)', ok: 'var(--green-500)' };
const FIELDS = ['id', 'name', 'category', 'provider', 'plan', 'period', 'amount', 'currency', 'lastPaid', 'nextRenewal', 'autoRenew', 'status', 'loginUrl', 'notes'];
const blank = () => ({ id: '', name: '', category: 'Other', provider: '', plan: '', period: 'YEARLY', amount: '', currency: 'NGN', lastPaid: '', nextRenewal: '', autoRenew: 'unknown', status: 'ACTIVE', loginUrl: '', notes: '' });

function countdown(r) {
  if (r.daysLeft === null || r.daysLeft === undefined) return null;
  if (r.daysLeft < 0) return `Overdue by ${-r.daysLeft} day${r.daysLeft === -1 ? '' : 's'}`;
  if (r.daysLeft === 0) return 'Renews today';
  return `${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left`;
}

function Row({ r }) {
  const left = countdown(r);
  return (
    <div className="card" style={{ margin: 0, opacity: r.status === 'ACTIVE' ? 1 : 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.category}</div>
          <b>{r.name}</b>
          <div style={{ fontSize: 13 }}>{r.provider}{r.plan ? ` · ${r.plan}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <b>{r.period === 'FREE' ? 'Free' : money(r.amount, r.currency)}</b>
          <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.periodName}{r.status !== 'ACTIVE' ? ` · ${r.statusName}` : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 13, marginTop: 8 }}>
        <span>Next renewal: <b>{date(r.nextRenewal)}</b></span>
        {left && <span style={{ color: DUE_COLOR[r.due], fontWeight: 600 }}>{left}</span>}
        <span>Last paid: {date(r.lastPaid)}</span>
        <span>Auto-renew: {r.autoRenew === 'unknown' ? 'not sure' : r.autoRenew}</span>
        {r.loginUrl && <a href={r.loginUrl} target="_blank" rel="noreferrer">Sign in ↗</a>}
      </div>
      {r.missing?.length > 0 && <p style={{ fontSize: 12, color: 'var(--gold)', margin: '6px 0 0' }}>Fill in: {r.missing.join(', ')}</p>}
      {r.notes && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>{r.notes}</p>}
    </div>
  );
}

function Editor({ r, i, options, set, remove }) {
  const f = (k) => ({ value: r[k] ?? '', onChange: (e) => set(i, k, e.target.value) });
  const lbl = { fontSize: 12, color: 'var(--slate-400)', display: 'block' };
  return (
    <div className="card" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
      <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>Name</span><input {...f('name')} placeholder="e.g. Domain — zappipay.com.ng" /></label>
      <label><span style={lbl}>Type</span><select {...f('category')}>{options.categories.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label><span style={lbl}>Provider</span><input {...f('provider')} placeholder="e.g. Whogohost" /></label>
      <label><span style={lbl}>Plan / package</span><input {...f('plan')} /></label>
      <label><span style={lbl}>Billing</span><select {...f('period')}>{Object.entries(options.periods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label><span style={lbl}>Amount</span><input {...f('amount')} inputMode="decimal" placeholder="0.00" /></label>
      <label><span style={lbl}>Currency</span><select {...f('currency')}>{options.currencies.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label><span style={lbl}>Last paid</span><input type="date" {...f('lastPaid')} /></label>
      <label><span style={lbl}>Next renewal</span><input type="date" {...f('nextRenewal')} /></label>
      <label><span style={lbl}>Auto-renew</span><select {...f('autoRenew')}><option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      <label><span style={lbl}>Status</span><select {...f('status')}>{Object.entries(options.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>Sign-in page</span><input {...f('loginUrl')} placeholder="https://…" /></label>
      <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>Notes (no passwords or keys)</span><input {...f('notes')} /></label>
      <button type="button" className="btn btn-secondary" style={{ width: 'auto', justifySelf: 'start' }} onClick={() => remove(i)}>Remove</button>
    </div>
  );
}

export default function AdminSubscriptions() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { getSubscriptions().then(setD).catch((e) => setErr(e.message)); }, []);

  const start = () => { setMsg(''); setEdit(d.rows.map((r) => Object.fromEntries(FIELDS.map((k) => [k, r[k] ?? ''])))); };
  const set = (i, k, v) => setEdit((rows) => rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  const remove = (i) => setEdit((rows) => rows.filter((_, n) => n !== i));
  const save = async () => {
    setBusy(true); setErr('');
    try { setD(await saveSubscriptions(edit)); setEdit(null); setMsg('Saved.'); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const t = d?.totals;
  const per = (o) => Object.entries(o || {}).map(([c, v]) => money(v, c)).join(' + ') || '—';

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>🧾 Subscriptions</h1>
        <p>Every plan and package the app runs on, what it costs and when it renews. You get a reminder 14, 7, 3, 1 and 0 days before each renewal date.</p>
      </div>
      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p className="empty-state">Loading…</p>}
      {d && (
        <>
          {d.starter && !edit && <p style={{ fontSize: 13, color: 'var(--gold)' }}>This is a starter list. Press Edit, fill in the amounts and dates from your receipts, then Save.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Running cost a year</div><b>{per(t.yearly)}</b><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>about {per(t.monthly)} a month</div></div>
            <div className="card" style={{ margin: 0 }}><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Pay as you go (not in the total)</div><b style={{ fontSize: 14 }}>{t.payAsYouGo.join(', ') || '—'}</b></div>
            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Renewing soon</div>
              {d.upcoming.length === 0 ? <b style={{ fontSize: 14 }}>Nothing in the next 14 days</b> : d.upcoming.map((u) => <div key={u.id} style={{ fontSize: 13, color: DUE_COLOR[u.due] }}>{u.name} — {countdown(u)}</div>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {!edit && <button type="button" className="btn" style={{ width: 'auto' }} onClick={start}>Edit</button>}
            {edit && <>
              <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setEdit((rows) => [...rows, blank()])}>+ Add</button>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => { setEdit(null); setErr(''); }}>Cancel</button>
            </>}
            {msg && <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--green-500)' }}>{msg}</span>}
          </div>
          <div style={{ display: 'grid', gap: 10, maxWidth: 860 }}>
            {edit ? edit.map((r, i) => <Editor key={i} r={r} i={i} options={d.options} set={set} remove={remove} />) : d.rows.map((r) => <Row key={r.id} r={r} />)}
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', maxWidth: 860 }}>🔒 {d.note}</p>
        </>
      )}
    </AdminLayout>
  );
}
