import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCircle, inviteToCircle, leaveCircle, orderCircle, startCircle, cancelCircle, requestCircleRelease } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import useAutoRefresh from '../lib/useAutoRefresh';
import { naira, PER, OFTEN, STATUS, fmtDay, Agreement, RulesSummary } from '../components/circles/shared';

const btnSm = { width: 'auto', padding: '6px 12px', fontSize: 13 };

function Progress({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div style={{ height: 10, borderRadius: 6, background: 'var(--slate-800)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }} /></div>;
}

export default function CircleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [who, setWho] = useState('');
  const [order, setOrder] = useState(null);
  const [pin, setPin] = useState(null); // 'start' | 'release'
  const [relReason, setRelReason] = useState('');
  const [relAgree, setRelAgree] = useState(false);
  const [showRel, setShowRel] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const load = () => getCircle(id).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  useAutoRefresh(load, d?.circle?.status === 'ACTIVE' || d?.circle?.status === 'FORMING');

  async function act(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setErr(e.message); }
  }
  if (!d) return <div className="app-shell"><div className="page-header"><Link to="/circles" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Ajo Circle</Link></div>{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;

  const c = d.circle;
  const link = `${window.location.origin}/circle/${c.code}`;
  const joined = d.members.filter((m) => m.status === 'JOINED');
  const list = order ? order.map((mid) => joined.find((m) => m.id === mid)).filter(Boolean) : joined;
  const move = (i, dir) => { const o = (order || joined.map((m) => m.id)).slice(); const j = i + dir; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
  const share = `Join my Ajo Circle “${c.name}” on ZAPPI PAY — ${naira(c.amount)} every ${PER[c.frequency]}, ${c.size} members, paid automatically and in turn. Read the rules and join: ${link}`;

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/circles" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Ajo Circle</Link>
        <h1>{c.name}</h1>
        <p><span style={{ color: STATUS[c.status]?.color }}>● {STATUS[c.status]?.label}</span> · {naira(c.amount)} {OFTEN[c.frequency].toLowerCase()} · {c.size} members</p>
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', margin: '0 16px 12px', fontSize: 14 }}>{msg}</p>}

      {d.me?.owed > 0 && (
        <div className="card" style={{ border: '1px solid var(--red-500)' }}>
          <b>You owe {naira(d.me.owed)}</b>
          <p style={{ fontSize: 13, margin: '4px 0 8px', color: 'var(--slate-400)' }}>Fund your wallet — it’s taken automatically the moment money comes in.{d.me.received ? ' Until it’s settled you can’t buy, send or withdraw (you’ve already been paid out).' : ''}</p>
          <Link to="/wallet" className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Fund wallet</Link>
        </div>
      )}
      {d.me && !d.me.received && d.me.strikes > 0 && !d.me.movedToLast && <div className="card" style={{ border: '1px solid var(--gold)', fontSize: 13 }}>⚠ {d.me.strikes} missed payment{d.me.strikes === 1 ? '' : 's'}. {Math.max(0, c.strikesToLast - d.me.strikes)} more and your payout number moves to the end.</div>}

      {c.status === 'ACTIVE' && d.current && (
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Payout {d.current.number} of {c.size}</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 8px' }}>→ {d.current.recipientIsMe ? 'You 🎉' : d.current.recipient}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>🔒 In the pot</span><b>{naira(d.current.inPot)}{d.current.released > 0 ? ` (+${naira(d.current.released)} already released)` : ''} of {naira(d.current.expected)}</b></div>
          <Progress value={d.current.collected} max={d.current.expected} />
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Locked: nobody can spend this — not members, not the creator, not ZAPPI PAY. It’s paid out automatically when everyone has paid.</p>
          {d.current.waitingFor.length > 0 ? (
            <div style={{ marginTop: 10, background: 'rgba(245,184,46,0.08)', border: '1px solid rgba(245,184,46,0.4)', borderRadius: 10, padding: 10 }}>
              <b style={{ fontSize: 13 }}>⏳ Waiting for {d.current.waitingFor.length} member{d.current.waitingFor.length === 1 ? '' : 's'}</b>
              {d.current.waitingFor.map((w) => <div key={w.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}><span>{w.name}{w.late ? <span style={{ color: 'var(--red-500)' }}> · late</span> : ''}</span><span>owes {naira(w.owes)}</span></div>)}
            </div>
          ) : <p style={{ fontSize: 13, color: 'var(--green-500)', margin: '8px 0 0' }}>✅ Everyone has paid — paying out now.</p>}
          {d.current.recipientIsMe && d.current.waitingFor.length > 0 && d.current.inPot > 0 && !d.releases.some((r) => r.status === 'PENDING') && (
            !showRel ? <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setShowRel(true)}>Need it now? Ask for the collected money early</button> : (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--slate-800)', paddingTop: 10 }}>
                <b style={{ fontSize: 14 }}>Ask for early release</b>
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 6px' }}>You receive what’s in the pot now (minus any payout fee). The rest is paid to you when the late members pay. ZAPPI PAY reviews and approves it.</p>
                <input value={relReason} onChange={(e) => setRelReason(e.target.value)} maxLength={300} placeholder="Why do you need it now? (optional)" aria-label="Reason" style={{ width: '100%', boxSizing: 'border-box' }} />
                <label style={{ display: 'flex', gap: 8, fontSize: 13, margin: '8px 0' }}><input type="checkbox" checked={relAgree} onChange={(e) => setRelAgree(e.target.checked)} style={{ width: 'auto' }} /> I agree to receive the rest later, when everyone has paid.</label>
                <button type="button" className="btn" disabled={!relAgree} onClick={() => setPin('release')}>Send request</button>
              </div>
            )
          )}
          {d.releases.filter((r) => r.status === 'PENDING').map((r) => <p key={r.id} style={{ fontSize: 13, color: 'var(--gold)', margin: '8px 0 0' }}>⏳ Early release of {naira(r.amount)} is waiting for ZAPPI PAY’s approval.</p>)}
        </div>
      )}
      {c.status === 'ACTIVE' && d.nextDueAt && <div className="card" style={{ fontSize: 14 }}>📅 Next payment day: <b>{fmtDay(d.nextDueAt)}</b> — {naira(c.amount)} is taken from every wallet. Reminders 3 days before.</div>}
      {c.status === 'COMPLETED' && <div className="card" style={{ textAlign: 'center' }}>🎉 <b>Complete!</b> Every member has been paid. Thank you for saving together.</div>}

      {c.status === 'FORMING' && (
        <div className="card">
          <b>Invite members ({joined.length}/{c.size} joined)</b>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Only ZAPPI PAY users can join. Everyone reads the rules and agreement and accepts with their PIN.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={btnSm} onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg('Link copied ✓'))}>Copy invite link</button>
            <a className="btn btn-secondary" style={{ ...btnSm, textDecoration: 'none' }} href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          </div>
          {d.isCreator && (
            <form onSubmit={(e) => { e.preventDefault(); act(() => inviteToCircle(id, who).then((r) => { setWho(''); setMsg(`Invite sent to ${r.invited} ✓`); })); }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Invite by username or phone" aria-label="Username or phone" style={{ flex: 1 }} />
              <button type="submit" className="btn btn-secondary" style={btnSm} disabled={who.trim().length < 3}>Invite</button>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Members & payout order</b>
          {d.isCreator && c.status === 'FORMING' && joined.length > 1 && <button type="button" onClick={() => act(() => orderCircle(id, { shuffle: true }).then(() => setOrder(null)), 'Order shuffled ✓')} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>🔀 Shuffle</button>}
        </div>
        {list.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--slate-800)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.received ? 'var(--green-500)' : 'rgba(134,59,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{m.received ? '✓' : order ? i + 1 : m.position}</div>
            <div style={{ flex: 1, fontSize: 14 }}>
              <b>{m.name}</b>{m.isCreator ? <span style={{ fontSize: 11, color: 'var(--slate-400)' }}> · creator</span> : ''}
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                {m.received ? 'Paid out' : c.status === 'ACTIVE' ? 'Waiting for their turn' : 'Joined'}
                {m.thisRound && (m.thisRound.status === 'PAID' ? ' · ✅ paid this round' : m.thisRound.paid > 0 ? ` · part paid ${naira(m.thisRound.paid)}/${naira(m.thisRound.due)}` : ' · ⏳ not paid yet')}
                {m.strikes > 0 && <span style={{ color: 'var(--red-500)' }}> · {m.strikes} missed</span>}
                {m.movedToLast && ' · moved to the end'}
              </div>
            </div>
            {m.lowBalance && <span title="Wallet balance is below the next payment" style={{ fontSize: 11, color: 'var(--gold)', whiteSpace: 'nowrap' }}>⚠ low balance</span>}
            {d.isCreator && c.status === 'FORMING' && (
              <span style={{ display: 'flex', gap: 2 }}>
                <button type="button" aria-label="Move up" onClick={() => move(i, -1)} style={{ background: 'none', border: '1px solid var(--slate-700)', borderRadius: 6, color: 'inherit', cursor: 'pointer' }}>↑</button>
                <button type="button" aria-label="Move down" onClick={() => move(i, 1)} style={{ background: 'none', border: '1px solid var(--slate-700)', borderRadius: 6, color: 'inherit', cursor: 'pointer' }}>↓</button>
              </span>
            )}
          </div>
        ))}
        {d.members.filter((m) => m.status === 'INVITED').map((m) => <div key={m.id} style={{ fontSize: 13, color: 'var(--slate-400)', padding: '6px 0', borderTop: '1px solid var(--slate-800)' }}>✉️ {m.name} — invited, hasn’t joined yet</div>)}
        {order && <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => act(() => orderCircle(id, { order }).then(() => setOrder(null)), 'Payout order saved ✓')}>Save this order</button>}
      </div>

      {d.isCreator && c.status === 'FORMING' && (
        <div className="card">
          <button type="button" className="btn" disabled={joined.length !== c.size} onClick={() => setPin('start')}>{joined.length === c.size ? '▶ Start circle' : `Start (needs ${c.size - joined.length} more)`}</button>
          <button type="button" onClick={() => window.confirm('Cancel this circle? Members will be told.') && act(() => cancelCircle(id), 'Circle cancelled.')} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 13, marginTop: 10 }}>Cancel circle</button>
        </div>
      )}
      {!d.isCreator && c.status === 'FORMING' && d.me && <div className="card"><button type="button" onClick={() => window.confirm('Leave this circle?') && act(() => leaveCircle(id).then(() => navigate('/circles')))} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 14 }}>Leave circle</button></div>}

      <div className="card">
        <b>Rules</b>
        <RulesSummary c={c} />
        {c.extraRules && <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: '8px 0 0' }}><b>Creator’s rules:</b> {c.extraRules}</p>}
        <button type="button" onClick={() => setShowAgreement(!showAgreement)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: '10px 0 0', fontSize: 14 }}>📜 {showAgreement ? 'Hide' : 'Read'} the agreement{d.me?.agreedAt ? ` (you accepted it on ${fmtDay(d.me.agreedAt)})` : ''}</button>
        {showAgreement && <div style={{ marginTop: 8 }}><Agreement terms={d.agreement} /></div>}
      </div>

      {d.rounds.length > 0 && (
        <div className="card">
          <b>Payouts</b>
          {d.rounds.map((r) => <div key={r.number} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}><span>{r.number}. {r.recipient} · {fmtDay(r.dueAt)}</span><span style={{ color: r.status === 'PAID' ? 'var(--green-500)' : 'var(--gold)' }}>{r.status === 'PAID' ? `✅ ${naira(r.collected)}` : '⏳ collecting'}</span></div>)}
        </div>
      )}

      <div className="card">
        <b>History</b>
        {d.events.map((e, i) => <div key={i} style={{ fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}>{e.message}<div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{new Date(e.at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>)}
      </div>

      <PinConfirm
        open={Boolean(pin)}
        summary={pin === 'start' ? `Start “${c.name}” — ${naira(c.amount)} every ${PER[c.frequency]} from every member` : `Ask for ${naira(d.current?.inPot || 0)} early from “${c.name}”`}
        onSubmit={async (auth) => {
          if (pin === 'start') await startCircle(id, auth).then((r) => setMsg(`Started ✓ First payment day: ${fmtDay(r.startAt)}`));
          else await requestCircleRelease(id, { reason: relReason, agree: relAgree, ...auth }).then(() => { setShowRel(false); setMsg('Request sent — ZAPPI PAY will review it.'); });
          setPin(null);
          load();
        }}
        onError={(e) => setErr(e.message)}
        onClose={() => setPin(null)}
      />
      <BottomNav />
    </div>
  );
}
