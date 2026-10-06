import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminCircles, getAdminCircle, reviewCircleRelease, reviewCircleAppeal, unbanCircleMember, stopCircle, getSettings, updateSettings } from '../../api';
import { useShowMore } from '../../components/ShowMore';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';
import { naira, OFTEN, STATUS, fmtDay, RulesSummary } from '../../components/circles/shared';

const btn = { width: 'auto', padding: '5px 12px', fontSize: 13 };

function Switch() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { getSettings().then((d) => setS(d.settings || d)).catch(() => {}); }, []);
  if (!s) return null;
  async function save(patch, ok) {
    setMsg('');
    try { await updateSettings(patch); setS((x) => ({ ...x, ...patch })); setMsg(ok); } catch (e) { setMsg(e.message); }
  }
  return (
    <div className="card" style={{ margin: '0 0 16px', border: s.circlesEnabled ? undefined : '1px solid var(--gold)' }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
        <input type="checkbox" checked={Boolean(s.circlesEnabled)} onChange={(e) => window.confirm(e.target.checked ? 'Turn Ajo Circle ON for customers? Make sure a lawyer has reviewed the agreement first.' : 'Turn Ajo Circle OFF? Running circles keep running; nobody can create or join new ones.') && save({ circlesEnabled: e.target.checked }, e.target.checked ? 'Ajo Circle is ON.' : 'Ajo Circle is OFF for new circles.')} style={{ width: 'auto' }} />
        🔄 Ajo Circle is {s.circlesEnabled ? 'ON' : 'OFF'} for customers
      </label>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 8px' }}>Before turning it on, have a Nigerian lawyer review the member agreement and your terms (rotating savings, automatic debits, fees, spending limits on defaulters).</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        {[['circleMaxAmount', 'Max contribution (₦)'], ['circleMaxMembers', 'Max members'], ['circleBanStrikes', 'Missed payments before block']].map(([k, l]) => (
          <label key={k} style={{ display: 'grid', gap: 2 }}>{l}<input type="number" defaultValue={Number(s[k])} onBlur={(e) => Number(e.target.value) !== Number(s[k]) && save({ [k]: Number(e.target.value) }, 'Saved.')} style={{ width: 150 }} /></label>
        ))}
      </div>
      {msg && <p style={{ fontSize: 13, color: 'var(--green-500)', margin: '6px 0 0' }}>{msg}</p>}
    </div>
  );
}

function Detail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getAdminCircle(id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="error-text">{err}</p>;
  if (!d) return <p className="empty-state">Loading…</p>;
  const c = d.circle;
  return (
    <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--purple)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{c.name}</b><button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer' }}>Close</button></div>
      <RulesSummary c={c} />
      {d.current && <p style={{ fontSize: 13 }}>Payout {d.current.number} → {d.current.recipient} · in pot {naira(d.current.inPot)} of {naira(d.current.expected)}{d.current.waitingFor.length ? ` · waiting for ${d.current.waitingFor.map((w) => `${w.name} (${naira(w.owes)})`).join(', ')}` : ''}</p>}
      <table><thead><tr><th>#</th><th>Member</th><th>Paid out</th><th>Strikes</th><th>Owes</th></tr></thead>
        <tbody>{d.members.filter((m) => m.status === 'JOINED').map((m) => <tr key={m.id}><td>{m.position}</td><td>{m.name}{m.isCreator ? ' (creator)' : ''}</td><td>{m.received ? '✅' : '—'}</td><td>{m.strikes}</td><td>{m.owed > 0 ? naira(m.owed) : '—'}</td></tr>)}</tbody></table>
      <details style={{ marginTop: 8 }}><summary style={{ cursor: 'pointer', fontSize: 13 }}>History</summary>{d.events.map((e, i) => <div key={i} style={{ fontSize: 12, padding: '3px 0' }}>{new Date(e.at).toLocaleString('en-NG')} — {e.message}</div>)}</details>
      {['ACTIVE', 'FORMING'].includes(c.status) && (
        <button type="button" className="btn btn-secondary" style={{ ...btn, marginTop: 10, color: 'var(--red-500)' }} onClick={async () => {
          const reason = window.prompt('Why are you stopping this circle? Members will see this. Money in unpaid pots goes back to the members who paid it.');
          if (!reason) return;
          try { await stopCircle(id, reason); onChanged(); onClose(); } catch (e) { setErr(e.message); }
        }}>Stop circle</button>
      )}
    </div>
  );
}

// Admin → Ajo Circles.
export default function AdminCircles() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('ACTIVE');
  const load = () => getAdminCircles().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  useAutoRefresh(load, true, ADMIN_REFRESH);
  const list = (d?.circles || []).filter((c) => filter === 'ALL' || c.status === filter);
  const page = useShowMore(list, [filter]);

  async function act(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>🔄 Ajo Circles</h1>
        <p>Group contributions: running circles, pots, late payments, early-release requests and appeals.</p>
      </div>
      <Switch />
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)' }}>{msg}</p>}
      {d && (
        <div className="grid" style={{ marginBottom: 16 }}>
          {[['Running', d.totals.running], ['Gathering members', d.totals.forming], ['Held in pots', naira(d.totals.inPots)], ['ZAPPI PAY fees earned', naira(d.totals.appFees)]].map(([l, v]) => <div key={l} className="card stat-card" style={{ margin: 0 }}><div className="label">{l}</div><div className="value">{v}</div></div>)}
        </div>
      )}

      {d?.releases?.length > 0 && (
        <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--gold)' }}>
          <b>⏳ Early release requests ({d.releases.length})</b>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 6px' }}>The member due for the payout asked for the money already collected, and agreed the rest follows when the late members pay.</p>
          {d.releases.map((r) => (
            <div key={r.id} style={{ padding: '8px 0', borderTop: '1px solid var(--slate-800)', fontSize: 13 }}>
              <b>{r.customer}</b> ({r.phone}) · “{r.circle}” · <b>{naira(r.amount)}</b>{r.reason ? ` — “${r.reason}”` : ''}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" className="btn" style={btn} onClick={() => window.confirm(`Release ${naira(r.amount)} to ${r.customer} now?`) && act(() => reviewCircleRelease(r.id, { approve: true }), 'Released ✓')}>Approve</button>
                <button type="button" className="btn btn-secondary" style={btn} onClick={() => { const note = window.prompt('Reason (the member sees it):') ?? ''; act(() => reviewCircleRelease(r.id, { approve: false, note }), 'Rejected.'); }}>Reject</button>
                <button type="button" className="btn btn-secondary" style={btn} onClick={() => setOpen(r.circleId)}>View circle</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {d?.appeals?.length > 0 && (
        <div className="card" style={{ margin: '0 0 16px' }}>
          <b>Appeals ({d.appeals.length})</b>
          {d.appeals.map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--slate-800)', fontSize: 13 }}>
              <b>{a.customer}</b> ({a.phone}) — “{a.message}”
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" className="btn" style={btn} onClick={() => act(() => reviewCircleAppeal(a.id, { approve: true }), 'Unblocked ✓')}>Approve & unblock</button>
                <button type="button" className="btn btn-secondary" style={btn} onClick={() => { const note = window.prompt('Reason (the member sees it):') ?? ''; act(() => reviewCircleAppeal(a.id, { approve: false, note }), 'Appeal rejected.'); }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={load} />}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {['ACTIVE', 'FORMING', 'COMPLETED', 'CANCELLED', 'ALL'].map((f) => <button key={f} type="button" className={filter === f ? 'btn' : 'btn btn-secondary'} style={btn} onClick={() => setFilter(f)}>{f === 'ALL' ? 'All' : STATUS[f].label} ({(d?.circles || []).filter((c) => f === 'ALL' || c.status === f).length})</button>)}
      </div>
      <div className="card admin-table-wrap" style={{ margin: '0 0 16px' }}>
        {!d ? <p className="empty-state">Loading…</p> : !list.length ? <p className="empty-state">No circles here.</p> : (
          <table>
            <thead><tr><th>Circle</th><th>Creator</th><th>Amount</th><th>Members</th><th>Payouts</th><th>Late</th><th>In pot</th><th /></tr></thead>
            <tbody>{page.visible.map((c) => (
              <tr key={c.id}>
                <td>{c.name}<div style={{ fontSize: 11, color: 'var(--slate-400)' }}>Starts {fmtDay(c.startAt)}</div></td>
                <td>{c.creator}</td>
                <td>{naira(c.amount)} {OFTEN[c.frequency].toLowerCase()}</td>
                <td>{c.joined}/{c.size}</td>
                <td>{c.paidRounds}/{c.size}</td>
                <td style={{ color: c.owing ? 'var(--red-500)' : undefined }}>{c.owing || '—'}</td>
                <td>{naira(c.inPots)}</td>
                <td><button type="button" className="btn btn-secondary" style={btn} onClick={() => setOpen(c.id)}>Open</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {page.more}
      </div>

      {d?.banned?.length > 0 && (
        <div className="card" style={{ margin: 0 }}>
          <b>Blocked from new circles ({d.banned.length})</b>
          {d.banned.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderTop: '1px solid var(--slate-800)', fontSize: 13 }}>
              <span><b>{b.name}</b> ({b.phone}) — {b.circleBanReason}</span>
              <button type="button" className="btn btn-secondary" style={btn} onClick={() => window.confirm(`Unblock ${b.name}? They must accept the agreement again when joining.`) && act(() => unbanCircleMember(b.id), 'Unblocked ✓')}>Unblock</button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
