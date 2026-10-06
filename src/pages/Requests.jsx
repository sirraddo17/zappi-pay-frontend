import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPayRequest, getPayRequests, closePayRequest, remindPayRequest } from '../api';
import BottomNav from '../components/BottomNav';
import PayoutAccount from '../components/PayoutAccount';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const TABS = [['forme', '📥 For you'], ['REQUEST', '💸 Pay me'], ['SPLIT', '🍽️ Split bill'], ['POOL', '🎁 Group gift'], ['mine', '🔗 My links']];
const STATUS = { OPEN: ['Open', 'var(--green-500)'], DONE: ['Paid', 'var(--green-500)'], CLOSED: ['Closed', 'var(--slate-400)'], CANCELLED: ['Cancelled', 'var(--slate-400)'], EXPIRED: ['Expired', 'var(--slate-400)'] };

export function shareText(r) {
  if (r.kind === 'POOL') return `🎁 Chip in for “${r.title}”${r.target ? ` — target ${naira(r.target)}` : ''}. Pay on ZAPPI PAY: ${r.link}`;
  if (r.kind === 'SPLIT') return `🍽️ Your share for “${r.title}” is ${naira(r.amount)}. Pay with ZAPPI PAY in one tap: ${r.link}`;
  return `💸 Please pay me ${naira(r.amount)} for “${r.title}”. Pay with ZAPPI PAY: ${r.link}`;
}

export async function shareRequest(r) {
  const text = shareText(r);
  try {
    if (navigator.share) { await navigator.share({ text, title: 'ZAPPI PAY' }); return; }
  } catch { /* cancelled */ }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function Card({ r, onChange }) {
  const [msg, setMsg] = useState('');
  const [st, color] = STATUS[r.status] || STATUS.OPEN;
  const pct = r.kind === 'POOL' && r.target ? Math.min(100, Math.round((r.collected / r.target) * 100)) : r.kind === 'SPLIT' && r.slots ? Math.round((r.payments / r.slots) * 100) : null;
  async function act(fn, ok) {
    setMsg('');
    try { await fn(); setMsg(ok); onChange?.(); } catch (e) { setMsg(e.message); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(r.link); setMsg('Link copied ✓'); } catch { setMsg(r.link); }
  }
  return (
    <div className="card" style={{ margin: '0 16px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div><b>{r.title}</b><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.kindLabel}{r.owner ? ` · from ${r.owner.name}` : ''}</div></div>
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{st}</span>
      </div>
      <div style={{ fontSize: 14, margin: '6px 0' }}>
        {r.kind === 'REQUEST' && naira(r.amount)}
        {r.kind === 'SPLIT' && <>{naira(r.amount)} each · {r.payments} of {r.slots} paid · {naira(r.collected)} received</>}
        {r.kind === 'POOL' && <>{naira(r.collected)} raised{r.target ? ` of ${naira(r.target)}` : ''} · {r.payments} gift{r.payments === 1 ? '' : 's'}</>}
      </div>
      {pct !== null && <div style={{ height: 6, background: 'var(--slate-800)', borderRadius: 3, marginBottom: 8 }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-500, #22c55e)', borderRadius: 3 }} /></div>}
      {r.isOwner && r.waitingFor?.length > 0 && <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>Waiting for: {r.waitingFor.join(', ')}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {r.isOwner ? (
          <>
            {r.status === 'OPEN' && <button type="button" className="btn" style={{ width: 'auto', padding: '5px 12px', fontSize: 13 }} onClick={() => shareRequest(r)}>Share</button>}
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: 13 }} onClick={copy}>Copy link</button>
            <Link to={`/r/${r.token}`} className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: 13, textDecoration: 'none' }}>View</Link>
            {r.status === 'OPEN' && r.waitingFor?.length > 0 && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: 13 }} onClick={() => act(() => remindPayRequest(r.id), 'Reminder sent ✓')}>Remind</button>}
            {r.status === 'OPEN' && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: 13 }} onClick={() => window.confirm('Close this link? Nobody will be able to pay it.') && act(() => closePayRequest(r.id), 'Closed')}>{r.payments ? 'Close' : 'Cancel'}</button>}
          </>
        ) : (
          <Link to={`/r/${r.token}`} className="btn" style={{ width: 'auto', padding: '5px 12px', fontSize: 13, textDecoration: 'none' }}>{r.kind === 'POOL' ? 'Chip in' : 'Pay'}</Link>
        )}
      </div>
      {msg && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--slate-300, #cbd5e1)', wordBreak: 'break-all' }}>{msg}</div>}
    </div>
  );
}

function CreateForm({ kind, onMade }) {
  const [f, setF] = useState({ title: '', amount: '', total: '', people: '2', includeMe: true, target: '', days: '14', note: '', invite: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const share = kind === 'SPLIT' && Number(f.total) > 0 && Number(f.people) >= 2 ? Math.ceil((Number(f.total) / Number(f.people)) * 100) / 100 : null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const invite = f.invite.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      const body = { kind, title: f.title, note: f.note || undefined, invite };
      if (kind === 'REQUEST') body.amount = Number(f.amount);
      if (kind === 'SPLIT') Object.assign(body, { total: Number(f.total), people: Number(f.people), includeMe: f.includeMe });
      if (kind === 'POOL') Object.assign(body, { target: f.target ? Number(f.target) : undefined, days: Number(f.days) });
      const r = await createPayRequest(body);
      onMade(r);
      setF((x) => ({ ...x, title: '', amount: '', total: '', target: '', note: '', invite: '' }));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const ph = { REQUEST: 'e.g. Rent, Ankara for owambe, Transport money', SPLIT: 'e.g. Dinner at Mama Put, Shared Netflix, Fuel', POOL: 'e.g. Tolu’s birthday, Wedding gift for Bayo, Office send-forth' };
  return (
    <form className="card" style={{ margin: '0 16px 12px' }} onSubmit={submit}>
      <p style={{ marginTop: 0, fontSize: 13, color: 'var(--slate-400)' }}>
        {kind === 'REQUEST' && 'Make a link that says “pay me”. Send it on WhatsApp — they pay on ZAPPI PAY and it comes straight to you.'}
        {kind === 'SPLIT' && 'You paid a bill? Split it — each person gets one link to pay their share, and you can see who has paid.'}
        {kind === 'POOL' && 'Collect money from many people for a gift or contribution. Everyone can give any amount; it comes straight to you as they pay.'}
      </p>
      {err && <p className="error-text">{err}</p>}
      <div className="field"><label htmlFor="rqT">What is it for?</label><input id="rqT" maxLength={80} value={f.title} onChange={set('title')} placeholder={ph[kind]} required /></div>
      {kind === 'REQUEST' && <div className="field"><label htmlFor="rqA">Amount (₦)</label><input id="rqA" type="number" inputMode="numeric" min="100" max="500000" value={f.amount} onChange={set('amount')} required /></div>}
      {kind === 'SPLIT' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor="rqTot">Total bill (₦)</label><input id="rqTot" type="number" inputMode="numeric" min="200" value={f.total} onChange={set('total')} required /></div>
            <div className="field"><label htmlFor="rqP">Number of people</label><input id="rqP" type="number" inputMode="numeric" min="2" max="50" value={f.people} onChange={set('people')} required /></div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 8 }}><input type="checkbox" checked={f.includeMe} onChange={set('includeMe')} style={{ width: 'auto' }} /> Count me as one of them (I pay my own share)</label>
          {share && <p style={{ fontSize: 14, margin: '0 0 10px' }}>Each person pays <b>{naira(share)}</b> · {f.includeMe ? Number(f.people) - 1 : Number(f.people)} people to pay you</p>}
        </>
      )}
      {kind === 'POOL' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label htmlFor="rqTg">Target (₦, optional)</label><input id="rqTg" type="number" inputMode="numeric" min="100" value={f.target} onChange={set('target')} /></div>
          <div className="field"><label htmlFor="rqD">Open for</label><select id="rqD" value={f.days} onChange={set('days')}>{[3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}</select></div>
        </div>
      )}
      <div className="field"><label htmlFor="rqN">Note (optional)</label><input id="rqN" maxLength={300} value={f.note} onChange={set('note')} placeholder="Anything they should know" /></div>
      <div className="field">
        <label htmlFor="rqI">Ask ZAPPI PAY users directly (optional)</label>
        <input id="rqI" value={f.invite} onChange={set('invite')} placeholder="Phone numbers or @usernames, separated by commas" />
        <small style={{ color: 'var(--slate-400)' }}>They get a notification. Anyone else can pay with the link you share.</small>
      </div>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Making link…' : 'Make link'}</button>
    </form>
  );
}

// More → Request money: Pay me links, split bills and group gifts.
export default function Requests() {
  const [tab, setTab] = useState('REQUEST');
  const [d, setD] = useState(null);
  const [made, setMade] = useState(null);
  const [err, setErr] = useState('');
  const load = () => getPayRequests().then((x) => { setD(x); if (x.forMe.length && !made) setTab((t) => (t === 'REQUEST' && x.forMe.length ? 'forme' : t)); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/more" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>Request money</h1>
        <p>Pay me links, split bills and group gifts — paid straight to you.</p>
      </div>
      <PayoutAccount purpose="payments" />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 12px' }}>
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 12px', fontSize: 13, whiteSpace: 'nowrap' }} onClick={() => { setTab(k); setMade(null); }}>
            {l}{k === 'forme' && d?.forMe?.length ? ` (${d.forMe.length})` : ''}
          </button>
        ))}
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}

      {made && (
        <div className="card" style={{ margin: '0 16px 12px', border: '1px solid var(--green-500)' }}>
          <b>✅ Your link is ready</b>
          <p style={{ fontSize: 13, wordBreak: 'break-all', margin: '6px 0' }}>{made.link}</p>
          {made.notFound?.length > 0 && <p style={{ fontSize: 12, color: 'var(--gold)' }}>Not on ZAPPI PAY yet: {made.notFound.join(', ')} — send them the link; they can sign up and pay.</p>}
          <button type="button" className="btn" onClick={() => shareRequest(made.request)}>Share on WhatsApp</button>
        </div>
      )}

      {['REQUEST', 'SPLIT', 'POOL'].includes(tab) && <CreateForm kind={tab} onMade={(r) => { setMade(r); load(); }} />}

      {tab === 'forme' && (!d ? <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div> : d.forMe.length === 0 ? <p className="empty-state">Nobody has asked you to pay anything.</p> : d.forMe.map((r) => <Card key={r.id} r={r} />))}
      {tab === 'mine' && (!d ? <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div> : d.mine.length === 0 ? <p className="empty-state">You haven’t made any links yet.</p> : d.mine.map((r) => <Card key={r.id} r={r} onChange={load} />))}
      {['REQUEST', 'SPLIT', 'POOL'].includes(tab) && d?.mine?.filter((r) => r.kind === tab && r.status === 'OPEN').length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: '8px 16px' }}>Open {tab === 'POOL' ? 'group gifts' : tab === 'SPLIT' ? 'split bills' : 'requests'}</h2>
          {d.mine.filter((r) => r.kind === tab && r.status === 'OPEN').map((r) => <Card key={r.id} r={r} onChange={load} />)}
        </>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 16px' }}>Money goes straight to you — ZAPPI PAY doesn’t hold it. Links last 14 days (group gifts: up to 90). Only ask people you know; never pay a stranger’s link.</p>
      <BottomNav />
    </div>
  );
}
