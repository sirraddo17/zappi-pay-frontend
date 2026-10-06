import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFamily, inviteFamily, respondFamily, leaveFamily, updateFamily, familySendNow, removeFamily } from '../api';
import { SERVICE_LABEL } from '../lib/repeat';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const date = (d) => new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });

function Controls({ m, services, onSaved }) {
  const [limit, setLimit] = useState(m.dailyLimit ? String(m.dailyLimit) : '');
  const [allowed, setAllowed] = useState(Array.isArray(m.allowedServices) ? m.allowedServices : services);
  const [send, setSend] = useState(m.allowSendMoney);
  const [amt, setAmt] = useState(m.allowanceAmount ? String(m.allowanceAmount) : '');
  const [freq, setFreq] = useState(m.allowanceFrequency || 'WEEKLY');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (k) => setAllowed((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  async function save() {
    setBusy(true);
    setErr('');
    try {
      await updateFamily(m.id, { dailyLimit: limit ? Number(limit) : null, allowedServices: allowed, allowSendMoney: send, allowanceAmount: amt ? Number(amt) : null, allowanceFrequency: amt ? freq : undefined });
      onSaved('Saved.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 10, paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor={`al-${m.id}`}>Allowance (₦)</label>
          <input id={`al-${m.id}`} type="number" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="None" />
        </div>
        <div className="field" style={{ flex: '1 1 120px' }}>
          <label htmlFor={`fq-${m.id}`}>How often</label>
          <select id={`fq-${m.id}`} value={freq} onChange={(e) => setFreq(e.target.value)}>
            <option value="WEEKLY">Every week</option>
            <option value="MONTHLY">Every month</option>
          </select>
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor={`dl-${m.id}`}>Daily spending limit (₦)</label>
          <input id={`dl-${m.id}`} type="number" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit" />
        </div>
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>They can buy:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {services.map((k) => (
          <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, padding: '5px 9px', borderRadius: 8, border: `1px solid ${allowed.includes(k) ? 'var(--purple)' : 'var(--slate-700)'}` }}>
            <input type="checkbox" checked={allowed.includes(k)} onChange={() => toggle(k)} style={{ width: 'auto' }} /> {SERVICE_LABEL[k] || k}
          </label>
        ))}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
        <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} style={{ width: 'auto' }} /> Allow sending money to friends or banks
      </label>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      <button type="button" className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}

// Profile → Family: allowances and spending controls.
export default function Family() {
  const [d, setD] = useState(null);
  const [who, setWho] = useState('');
  const [nick, setNick] = useState('');
  const [open, setOpen] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    getFamily().then(setD).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function act(fn, done) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await fn();
      if (done) setMsg(done);
      load();
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const mb = d?.managedBy;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/profile" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>👨‍👩‍👧 Family</h1>
        <p>Send an allowance and set spending limits for your family</p>
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 16px 8px' }}>{msg}</p>}
      {!d && !err && <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>}

      {mb && (
        <div className="card" style={{ border: '1px solid var(--purple)' }}>
          {mb.status === 'PENDING' ? (
            <>
              <div style={{ fontWeight: 700 }}>{mb.parentName} wants to add you to their family</div>
              <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>They’ll be able to send you an allowance and set limits on your account: a daily spending limit, which services you can buy, and whether you can send money out. They can see your balance and recent purchases. You can leave at any time.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => act(() => respondFamily(true), 'You joined the family.')}>Accept</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => act(() => respondFamily(false), 'Invite declined.')}>Decline</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700 }}>Managed by {mb.parentName}</div>
              <ul style={{ fontSize: 13, color: 'var(--slate-300)', paddingLeft: 18, margin: '8px 0' }}>
                {mb.allowanceAmount && <li>Allowance: {naira(mb.allowanceAmount)} {mb.allowanceFrequency === 'WEEKLY' ? 'every week' : 'every month'}{mb.nextAllowanceAt ? ` · next ${date(mb.nextAllowanceAt)}` : ''}</li>}
                <li>Daily limit: {mb.dailyLimit ? `${naira(mb.dailyLimit)} (${naira(Math.max(0, mb.dailyLimit - mb.spentToday))} left today)` : 'none'}</li>
                <li>Can buy: {Array.isArray(mb.allowedServices) ? mb.allowedServices.map((k) => SERVICE_LABEL[k] || k).join(', ') || 'nothing' : 'everything'}</li>
                <li>Sending money: {mb.allowSendMoney ? 'allowed' : `only back to ${mb.parentName.split(' ')[0]}`}</li>
              </ul>
              <button type="button" className="btn btn-secondary" style={{ color: 'var(--red-500)' }} disabled={busy} onClick={() => window.confirm('Leave this family? Your allowance and limits stop straight away.') && act(leaveFamily, 'You left the family.')}>Leave family</button>
            </>
          )}
        </div>
      )}

      {d && !(mb?.status === 'ACTIVE') && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); act(() => inviteFamily({ identifier: who, nickname: nick }), 'Invite sent. They need to accept it in their app.').then((ok) => { if (ok) { setWho(''); setNick(''); } }); }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Add a family member</h2>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: -6 }}>They need their own ZAPPI PAY account. They’ll get an invite to accept.</p>
          <div className="field">
            <label htmlFor="fam-who">Their username or phone number</label>
            <input id="fam-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder="@username or 080…" required />
          </div>
          <div className="field">
            <label htmlFor="fam-nick">Nickname (optional)</label>
            <input id="fam-nick" value={nick} maxLength={30} onChange={(e) => setNick(e.target.value)} placeholder="e.g. Tobi (son)" />
          </div>
          <button type="submit" className="btn" disabled={busy}>Send invite</button>
        </form>
      )}

      {d?.members?.map((m) => (
        <div key={m.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{m.nickname || m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{m.nickname ? `${m.name} · ` : ''}@{m.username || '—'}</div>
            </div>
            {m.status === 'ACTIVE' && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 800 }}>{naira(m.balance)}</div><div style={{ fontSize: 11, color: 'var(--slate-400)' }}>their balance</div></div>}
          </div>
          {m.status === 'PENDING' ? (
            <p style={{ fontSize: 13, color: 'var(--gold)', margin: '8px 0' }}>Waiting for them to accept your invite.</p>
          ) : (
            <>
              <div style={{ fontSize: 13, margin: '8px 0', lineHeight: 1.6 }}>
                Spent today: <b>{naira(m.spentToday)}</b>{m.dailyLimit ? ` of ${naira(m.dailyLimit)}` : ''}<br />
                {m.allowanceAmount ? <>Allowance: <b>{naira(m.allowanceAmount)}</b> {m.allowanceFrequency === 'WEEKLY' ? 'weekly' : 'monthly'}{m.nextAllowanceAt ? ` · next ${date(m.nextAllowanceAt)}` : ''}</> : 'No allowance set'}
                {m.lastAllowanceError && <><br /><span style={{ color: 'var(--red-500)' }}>Last allowance not sent: {m.lastAllowanceError}.</span></>}
              </div>
              {m.recent?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 8 }}>
                  Recent: {m.recent.map((o) => `${SERVICE_LABEL[o.service] || o.service} ${naira(o.amount)}`).join(' · ')}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOpen(open === m.id ? '' : m.id)}>{open === m.id ? 'Close' : 'Limits & allowance'}</button>
                {m.allowanceAmount > 0 && <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => window.confirm(`Send ${naira(m.allowanceAmount)} to ${m.name} now?`) && act(() => familySendNow(m.id), 'Allowance sent.')}>Send now</button>}
              </div>
              {open === m.id && <Controls m={m} services={d.services} onSaved={(t) => { setOpen(''); setMsg(t); load(); }} />}
            </>
          )}
          <button type="button" onClick={() => window.confirm(`Remove ${m.name} from your family?`) && act(() => removeFamily(m.id), 'Removed.')} style={{ background: 'none', border: 'none', color: 'var(--red-500)', fontSize: 12, padding: 0, marginTop: 10, cursor: 'pointer' }}>Remove from family</button>
        </div>
      ))}
    </div>
  );
}
