import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdminContests, getAdminContest, createContest, updateContest, contestAction } from '../../api';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const PHASE = { LIVE: ['Live', 'var(--green-500)'], UPCOMING: ['Upcoming', 'var(--purple)'], ENDED: ['Ended — waiting for payout', 'var(--orange, #f97316)'], PAID: ['Paid', 'var(--slate-400)'], CANCELLED: ['Cancelled', 'var(--red-500)'] };

function toLocalInput(d) {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function fmt(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ContestForm({ initial, onSaved, onCancel }) {
  const started = initial && new Date(initial.startsAt) <= new Date();
  const now = new Date();
  const [title, setTitle] = useState(initial?.title || 'Referral Contest');
  const [description, setDescription] = useState(initial?.description || '');
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt || now));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt || new Date(now.getTime() + 7 * 86400000)));
  const [prizes, setPrizes] = useState(initial?.prizes?.length ? initial.prizes.map(String) : ['10000', '5000', '2500']);
  const [minReferrals, setMinReferrals] = useState(String(initial?.minReferrals ?? 3));
  const [minAmount, setMinAmount] = useState(String(initial?.minQualifyingAmount ?? 100));
  const [autoPay, setAutoPay] = useState(Boolean(initial?.autoPay));
  const [requireVerified, setRequireVerified] = useState(initial ? initial.requireVerified !== false : true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = prizes.reduce((s, p) => s + (Number(p) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      prizes: prizes.map(Number).filter((n) => n > 0),
      minReferrals: Number(minReferrals),
      minQualifyingAmount: Number(minAmount),
      autoPay,
      requireVerified,
    };
    try {
      if (initial) await updateContest(initial.id, body);
      else await createContest(body);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ margin: '0 0 16px', maxWidth: 560 }} onSubmit={submit}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>{initial ? 'Edit contest' : 'New referral contest'}</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="field"><label htmlFor="ct">Title</label><input id="ct" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="cd">Message to customers (optional)</label>
        <textarea id="cd" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Invite the most friends this week and win cash!" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor="cs">Starts</label><input id="cs" type="datetime-local" value={startsAt} disabled={started} onChange={(e) => setStartsAt(e.target.value)} /></div>
        <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor="ce">Ends</label><input id="ce" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
      </div>

      <div className="field">
        <label>Prizes by position (₦)</label>
        {prizes.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ width: 44, fontSize: 13, color: 'var(--slate-400)' }}>{['1st', '2nd', '3rd'][i] || `${i + 1}th`}</span>
            <input type="number" min="0" value={p} onChange={(e) => setPrizes((list) => list.map((x, j) => (j === i ? e.target.value : x)))} />
            {prizes.length > 1 && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px' }} onClick={() => setPrizes((list) => list.filter((_, j) => j !== i))}>✕</button>}
          </div>
        ))}
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setPrizes((list) => [...list, ''])}>+ Add a winner position</button>
        <small style={{ display: 'block', color: 'var(--slate-400)', marginTop: 4 }}>Total prize money: <b>{naira(total)}</b>. One position = a single winner.</small>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="cm">Friends needed to win (minimum)</label>
          <input id="cm" type="number" min="1" value={minReferrals} onChange={(e) => setMinReferrals(e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 200px' }}>
          <label htmlFor="ca">Friend's first purchase/transfer at least (₦)</label>
          <input id="ca" type="number" min="0" value={minAmount} disabled={started} onChange={(e) => setMinAmount(e.target.value)} />
        </div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <input type="checkbox" checked={requireVerified} disabled={started} onChange={(e) => setRequireVerified(e.target.checked)} style={{ width: 'auto' }} />
        Friends must verify BVN/NIN to count (recommended — stops fake accounts)
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <input type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} style={{ width: 'auto' }} />
        Pay winners automatically when it ends
      </label>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 12px' }}>
        Leave this off to check the winners for fake accounts first, then press “Pay winners”. Either way you're alerted when it ends.
        Only friends who sign up during these dates and buy or send to a bank before the end are counted. Contests can't overlap.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create contest'}</button>
        <button className="btn btn-secondary" type="button" style={{ width: 'auto' }} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ContestDetail({ id, onChanged }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  function load() {
    getAdminContest(id).then(setData).catch((err) => setMsg(err.message));
  }
  useEffect(load, [id]);
  useAutoRefresh(load, data?.contest?.phase === 'LIVE', { ...ADMIN_REFRESH, fastMs: 60000, slowMs: 60000 });

  async function act(action, confirmText, body) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg('');
    try {
      await contestAction(id, action, body);
      load();
      onChanged();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="empty-state">{msg || 'Loading…'}</p>;
  const c = data.contest;
  const disq = new Set(c.disqualified || []);
  const winners = c.phase === 'LIVE' || c.phase === 'UPCOMING' ? data.projectedWinners : c.winners || [];

  if (editing) return <ContestForm initial={c} onSaved={() => { setEditing(false); load(); onChanged(); }} onCancel={() => setEditing(false)} />;

  return (
    <div className="card" style={{ margin: '0 0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{c.title}</h2>
          <div style={{ fontSize: 13, color: PHASE[c.phase]?.[1] }}>{PHASE[c.phase]?.[0]}</div>
          <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{fmt(c.startsAt)} → {fmt(c.endsAt)} · prizes {c.prizes.map(naira).join(' / ')} · min {c.minReferrals} friend{c.minReferrals === 1 ? '' : 's'}{c.minQualifyingAmount > 0 ? ` · qualifying spend ${naira(c.minQualifyingAmount)}` : ''} · {c.requireVerified !== false ? 'BVN/NIN verified friends only' : 'verification not required'} · {c.autoPay ? 'auto-pay' : 'you approve payout'}</div>
        </div>
        <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {(c.phase === 'LIVE' || c.phase === 'UPCOMING') && <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setEditing(true)}>Edit</button>}
          {c.phase === 'LIVE' && <button className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => act('end-now', 'End the contest now and fix the winners?')}>End now</button>}
          {c.status === 'AWAITING_PAYOUT' && (winners || []).length > 0 && (
            <button className="btn" style={{ width: 'auto' }} disabled={busy} onClick={() => act('pay', `Pay ${naira(winners.reduce((s, w) => s + w.prize, 0))} to ${winners.length} winner(s) now? This credits their wallets.`)}>Pay winners</button>
          )}
          {['LIVE', 'UPCOMING', 'ENDED'].includes(c.phase) && c.status !== 'PAYING' && <button className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => act('cancel', 'Cancel this contest? No prizes will be paid.')}>Cancel contest</button>}
        </div>
      </div>
      {msg && <p className="error-text" style={{ margin: '8px 0 0' }}>{msg}</p>}

      <h3 style={{ fontSize: 15, margin: '16px 0 6px' }}>{c.phase === 'LIVE' || c.phase === 'UPCOMING' ? 'Winners if it ended now' : c.status === 'PAID' ? 'Winners (paid)' : 'Winners'}</h3>
      {(winners || []).length === 0 ? <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Nobody has reached {c.minReferrals} counted friend{c.minReferrals === 1 ? '' : 's'} yet.</p> : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {winners.map((w) => <li key={w.rank}>{w.rank}. <Link to={`/admin/customers/${w.customerId}`} style={{ color: 'var(--purple)' }}>{w.name}</Link> — {w.qualified} friends — {naira(w.prize)}{w.paidAt ? ' ✓ paid' : ''}</li>)}
        </ul>
      )}

      <h3 style={{ fontSize: 15, margin: '16px 0 6px' }}>Standings</h3>
      <div className="admin-table-wrap">
        {data.standings.length === 0 ? <p className="empty-state">No sign-ups with a referral code yet.</p> : (
          <table>
            <thead><tr><th>#</th><th>Customer</th><th>Counted</th><th>Waiting</th><th></th></tr></thead>
            <tbody>
              {data.standings.map((r) => (
                <tr key={r.customerId} style={{ opacity: disq.has(r.customerId) ? 0.5 : 1 }}>
                  <td>{r.rank}</td>
                  <td><Link to={`/admin/customers/${r.customerId}`} style={{ color: 'var(--purple)' }}>{r.name}</Link><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{r.phone}{r.username ? ` · @${r.username}` : ''}</div></td>
                  <td>{r.qualified}</td>
                  <td>{r.pending}</td>
                  <td>{c.status === 'ACTIVE' && <button className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} disabled={busy} onClick={() => act('disqualify', null, { customerId: r.customerId })}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {disq.size > 0 && c.status === 'ACTIVE' && (
        <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>
          Removed: {[...disq].length} customer(s).{' '}
          {[...disq].map((cid) => <button key={cid} type="button" onClick={() => act('disqualify', null, { customerId: cid, restore: true })} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>restore {cid.slice(-5)}</button>)}
        </p>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>“Counted” = friends who signed up during the contest and bought something or sent to a bank{c.requireVerified !== false ? ', and verified their BVN/NIN' : ''}. “Waiting” = signed up but not finished yet. Removing someone takes them (and friends they referred) out of this contest.</p>
    </div>
  );
}

export default function AdminContests() {
  const [contests, setContests] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  function load() {
    getAdminContests().then((d) => { setContests(d.contests); if (!openId && d.contests[0]) setOpenId(d.contests[0].id); }).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Referral Contests</h1>
          <p>Reward the customers who bring the most new, active users</p>
        </div>
        {!creating && <button className="btn" style={{ width: 'auto' }} onClick={() => setCreating(true)}>+ New contest</button>}
      </div>
      {error && <p className="error-text">{error}</p>}
      {creating && <ContestForm onSaved={() => { setCreating(false); setOpenId(null); load(); }} onCancel={() => setCreating(false)} />}

      {contests === null ? <p className="empty-state">Loading…</p> : contests.length === 0 ? (
        !creating && <p className="empty-state">No contests yet. Create one to get customers inviting their friends.</p>
      ) : (
        <>
          <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {contests.map((c) => (
              <button key={c.id} type="button" className={openId === c.id ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => setOpenId(c.id)}>
                {c.title} · <span style={{ opacity: 0.8 }}>{PHASE[c.phase]?.[0].split(' ')[0]}</span>
              </button>
            ))}
          </div>
          {openId && <ContestDetail key={openId} id={openId} onChanged={load} />}
        </>
      )}
    </AdminLayout>
  );
}
