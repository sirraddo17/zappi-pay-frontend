import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCircles, createCircle, circleAgreementPreview, appealCircleBan } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { naira, PER, OFTEN, STATUS, fmtDay, Agreement, HowItWorks } from '../components/circles/shared';

const tomorrow = () => new Date(Date.now() + 26 * 3600 * 1000).toISOString().slice(0, 10);

function CreateForm({ limits, onDone }) {
  const [f, setF] = useState({ name: '', amount: '', frequency: 'WEEKLY', size: '5', startDate: tomorrow(), payoutFeeOn: false, payoutFee: '', penaltyFee: '', graceHours: '24', strikesToLast: '2', extraRules: '' });
  const [terms, setTerms] = useState(null);
  const [agree, setAgree] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const amount = Number(f.amount) || 0;
  const size = parseInt(f.size, 10) || 0;
  const pot = amount * size;
  const fee = f.payoutFeeOn ? Number(f.payoutFee) || 0 : 0;
  const maxFee = Math.floor(pot * 0.05);
  const appFee = Math.round(fee * limits.appShare) / 100;
  const input = { width: '100%', boxSizing: 'border-box' };

  async function review(e) {
    e.preventDefault();
    setErr('');
    if (fee > maxFee) return setErr(`The payout fee can be at most ${naira(maxFee)} (5% of the pot).`);
    try { setTerms((await circleAgreementPreview(f)).agreement); setAgree(false); } catch (e2) { setErr(e2.message); }
  }
  async function create(auth) {
    const r = await createCircle({ ...f, agree, ...auth });
    setConfirm(false);
    onDone(r.circle);
  }

  if (terms) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 17 }}>Read the agreement</h2>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: -6 }}>Every member — you too — accepts this before joining. They can re-read it any time.</p>
        <div style={{ maxHeight: 340, overflowY: 'auto', background: 'var(--slate-900, #0f172a)', borderRadius: 10, padding: 12, border: '1px solid var(--slate-700)' }}><Agreement terms={terms} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, margin: '12px 0' }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          I have read and accept this agreement, including automatic payments from my wallet.
        </label>
        {err && <p className="error-text">{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setTerms(null)}>Back</button>
          <button type="button" className="btn" disabled={!agree} onClick={() => setConfirm(true)}>Create circle</button>
        </div>
        <PinConfirm open={confirm} summary={`Create “${f.name}” · ${naira(amount)} ${OFTEN[f.frequency].toLowerCase()} · ${size} members`} onSubmit={create} onError={(e) => setErr(e.message)} onClose={() => setConfirm(false)} />
      </div>
    );
  }

  return (
    <form className="card" onSubmit={review}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>Start a circle</h2>
      <div className="field"><label htmlFor="cN">Circle name</label><input id="cN" maxLength={50} value={f.name} onChange={set('name')} placeholder="e.g. Office Ajo, Family Esusu" required style={input} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="field"><label htmlFor="cA">Each member pays (₦)</label><input id="cA" type="number" inputMode="numeric" min="100" max={limits.maxAmount} value={f.amount} onChange={set('amount')} required style={input} /></div>
        <div className="field"><label htmlFor="cF">How often</label><select id="cF" value={f.frequency} onChange={set('frequency')} style={input}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></div>
        <div className="field"><label htmlFor="cS">Number of members</label><input id="cS" type="number" min="2" max={limits.maxMembers} value={f.size} onChange={set('size')} required style={input} /></div>
        <div className="field"><label htmlFor="cD">First payment day</label><input id="cD" type="date" min={tomorrow()} value={f.startDate} onChange={set('startDate')} required style={input} /></div>
      </div>
      {pot > 0 && <p style={{ fontSize: 14, margin: '0 0 12px', background: 'rgba(134,59,255,0.1)', borderRadius: 10, padding: 10 }}>Each {PER[f.frequency]} one member receives <b>{naira(pot - fee)}</b>{fee > 0 ? ` (${naira(pot)} − ${naira(fee)} fee)` : ''}. The circle runs for {size} {PER[f.frequency]}s.</p>}

      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontSize: 14, color: 'var(--purple)' }}>Fees and late rules (optional)</summary>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '10px 0 6px' }}>
          <input type="checkbox" checked={f.payoutFeeOn} onChange={set('payoutFeeOn')} style={{ width: 'auto' }} /> Charge a payout fee
        </label>
        {f.payoutFeeOn && (
          <div className="field">
            <label htmlFor="cPF">Fee per payout (₦, max {naira(maxFee)})</label>
            <input id="cPF" type="number" min="0" max={maxFee} value={f.payoutFee} onChange={set('payoutFee')} style={input} />
            {fee > 0 && <small style={{ color: 'var(--slate-400)' }}>You get {naira(fee - appFee)} ({100 - limits.appShare}%), ZAPPI PAY gets {naira(appFee)} ({limits.appShare}%) from each payout. Every member sees this before joining.</small>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label htmlFor="cL">Late fee (₦, 0 = none)</label><input id="cL" type="number" min="0" max={Math.floor(amount * 0.1)} value={f.penaltyFee} onChange={set('penaltyFee')} style={input} /><small style={{ color: 'var(--slate-400)' }}>Max 10%. Goes into the pot.</small></div>
          <div className="field"><label htmlFor="cG">Late after (hours)</label><input id="cG" type="number" min="1" max="72" value={f.graceHours} onChange={set('graceHours')} style={input} /></div>
        </div>
        <div className="field"><label htmlFor="cK">Missed payments before a member’s payout number moves to the end</label><input id="cK" type="number" min="1" max="5" value={f.strikesToLast} onChange={set('strikesToLast')} style={input} /></div>
        <div className="field"><label htmlFor="cR">Your extra rules (everyone sees them)</label><textarea id="cR" rows={3} maxLength={1500} value={f.extraRules} onChange={set('extraRules')} placeholder="e.g. Be respectful in the group. Tell the group early if you’ll be late." style={{ ...input, fontFamily: 'inherit' }} /></div>
      </details>
      {err && <p className="error-text">{err}</p>}
      <button className="btn" type="submit">Review the agreement →</button>
    </form>
  );
}

function Appeal({ banned, onSent }) {
  const [msg, setMsg] = useState('');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (banned.appeal?.status === 'PENDING') return <div className="card" style={{ border: '1px solid var(--gold)' }}><b>Appeal sent</b><p style={{ fontSize: 13, margin: '4px 0 0' }}>ZAPPI PAY is reviewing it. You’ll get a notification.</p></div>;
  return (
    <form className="card" style={{ border: '1px solid var(--red-500)' }} onSubmit={async (e) => { e.preventDefault(); setErr(''); setBusy(true); try { await appealCircleBan({ message: msg, agree }); onSent(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); } }}>
      <b>You can’t join new circles right now</b>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>{banned.reason}. {banned.appeal?.status === 'REJECTED' ? `Your last appeal was not approved${banned.appeal.note ? `: ${banned.appeal.note}` : ''}. You can appeal again.` : 'Tell us what happened and how you’ll keep up with payments.'}</p>
      <textarea rows={3} maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Your appeal" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      <label style={{ display: 'flex', gap: 8, fontSize: 13, margin: '8px 0' }}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto' }} /> I will keep to the Ajo Circle agreement and pay on time.</label>
      {err && <p className="error-text">{err}</p>}
      <button className="btn" type="submit" disabled={busy || msg.trim().length < 15 || !agree}>Send appeal</button>
    </form>
  );
}

// Home → More → Ajo Circle.
export default function Circles() {
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  const load = () => getCircles().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/more" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>🔄 Ajo Circle</h1>
        <p>Save together with people you trust — ajo, esusu, adashe — paid automatically and in turn.</p>
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {!d ? <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div> : !d.enabled ? (
        <div className="card"><b>Coming soon</b><p style={{ fontSize: 14, color: 'var(--slate-400)' }}>Ajo Circle is almost ready. Here’s how it will work:</p><HowItWorks /></div>
      ) : (
        <>
          {d.banned && <Appeal banned={d.banned} onSent={load} />}
          {!creating && !d.banned && <div style={{ margin: '0 16px 12px' }}><button type="button" className="btn" onClick={() => setCreating(true)}>＋ Start a circle</button></div>}
          {creating && <CreateForm limits={d.limits} onDone={(c) => navigate(`/circles/${c.id}`)} />}
          {d.circles.length > 0 && (
            <div className="card">
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Your circles</h2>
              {d.circles.map((c) => (
                <Link key={c.id} to={c.myStatus === 'INVITED' ? `/circle/${c.code}` : `/circles/${c.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '10px 0', borderTop: '1px solid var(--slate-800)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b>{c.name}{c.isCreator ? ' · creator' : ''}</b>
                    <span style={{ fontSize: 12, color: STATUS[c.status]?.color }}>{c.myStatus === 'INVITED' ? 'Invited — tap to join' : STATUS[c.status]?.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{naira(c.amount)} {OFTEN[c.frequency].toLowerCase()} · {c.joined}/{c.size} members{c.position ? ` · your payout number: ${c.position}` : ''}{c.received ? ' · ✅ paid out' : ''}</div>
                  {c.owed > 0 && <div style={{ fontSize: 13, color: 'var(--red-500)' }}>You owe {naira(c.owed)} — fund your wallet</div>}
                  {c.status === 'FORMING' && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Starts {fmtDay(c.startAt)}</div>}
                </Link>
              ))}
            </div>
          )}
          <div className="card"><h2 style={{ marginTop: 0, fontSize: 16 }}>How it works</h2><HowItWorks /><p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '12px 0 0' }}>Ajo Circle is members saving together — no interest, no loans. ZAPPI PAY collects and pays out on the members’ instructions. Only join circles with people you know and trust.</p></div>
        </>
      )}
      <BottomNav />
    </div>
  );
}
