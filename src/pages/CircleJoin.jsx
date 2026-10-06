import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { previewCircle, joinCircle } from '../api';
import PinConfirm from '../components/PinConfirm';
import { setAfterLogin, clearAfterLogin } from '../lib/afterLogin';
import { naira, PER, STATUS, Agreement, RulesSummary, HowItWorks } from '../components/circles/shared';

// zappipay.com.ng/circle/<code> — invite link to an Ajo Circle.
export default function CircleJoin() {
  const { code } = useParams();
  const { customer, loading } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [agree, setAgree] = useState(false);
  const [read, setRead] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!customer) return;
    clearAfterLogin();
    previewCircle(code).then((x) => { setD(x); if (x.myStatus === 'JOINED') navigate(`/circles/${x.circle.id}`, { replace: true }); }).catch((e) => setErr(e.message));
  }, [loading, customer?.id, code]);

  function goLogin(to) {
    setAfterLogin(`/circle/${code}`);
    navigate(to === 'signup' ? '/signup' : '/login');
  }

  if (!loading && !customer) {
    return (
      <div className="app-shell">
        <div className="page-header"><h1>🔄 You’re invited to an Ajo Circle</h1><p>Save together on ZAPPI PAY — paid automatically and in turn.</p></div>
        <div className="card"><HowItWorks /></div>
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <button type="button" className="btn" onClick={() => goLogin('login')}>Log in to see the circle</button>
          <button type="button" className="btn btn-secondary" onClick={() => goLogin('signup')}>New here? Create a free account</button>
        </div>
      </div>
    );
  }
  if (err) return <div className="app-shell"><p className="error-text" style={{ margin: 16 }}>{err}</p><Link to="/circles" style={{ margin: 16, color: 'var(--purple)' }}>Go to Ajo Circle</Link></div>;
  if (!d) return <div className="page-loading">Loading…</div>;
  const c = d.circle;
  const open = c.status === 'FORMING' && d.spotsLeft > 0;

  return (
    <div className="app-shell" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <Link to="/circles" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Ajo Circle</Link>
        <h1>{c.name}</h1>
        <p>Created by <b>{d.creator}</b>{d.creatorUsername ? ` (@${d.creatorUsername})` : ''} · <span style={{ color: STATUS[c.status]?.color }}>{STATUS[c.status]?.label}</span> · {d.joined}/{c.size} joined</p>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>You pay</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{naira(c.amount)} <span style={{ fontSize: 15, fontWeight: 500 }}>every {PER[c.frequency]}</span></div>
        <div style={{ fontSize: 14, marginTop: 4 }}>Your turn: you receive <b>{naira(c.pot - c.payoutFee)}</b></div>
      </div>
      <div className="card"><b>The rules</b><RulesSummary c={c} />{c.extraRules && <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: '8px 0 0' }}><b>Creator’s rules:</b> {c.extraRules}</p>}</div>
      {open ? (
        <div className="card">
          <b>The agreement</b>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Read it all — you’re agreeing to automatic payments from your wallet. You can re-read it any time from the circle page.</p>
          <div ref={(el) => { if (el && !read && el.scrollHeight <= el.clientHeight + 20) setRead(true); }} onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setRead(true); }} style={{ maxHeight: 320, overflowY: 'auto', background: 'var(--slate-900, #0f172a)', borderRadius: 10, padding: 12, border: '1px solid var(--slate-700)' }}>
            <Agreement terms={d.agreement} />
          </div>
          {!read && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Scroll to the end of the agreement to continue.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, margin: '12px 0', opacity: read ? 1 : 0.5 }}>
            <input type="checkbox" disabled={!read} checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            I have read and accept the agreement. I authorise ZAPPI PAY to take {naira(c.amount)} from my wallet every {PER[c.frequency]} for this circle.
          </label>
          <button type="button" className="btn" disabled={!agree} onClick={() => setConfirm(true)}>Join with my PIN</button>
        </div>
      ) : <div className="card">{c.status === 'FORMING' ? 'This circle is full.' : 'This circle has already started — it can’t take new members.'}</div>}
      <PinConfirm open={confirm} summary={`Join “${c.name}” · ${naira(c.amount)} every ${PER[c.frequency]}`} onSubmit={async (auth) => { const r = await joinCircle(code, { agree, ...auth }); setConfirm(false); navigate(`/circles/${r.circleId}`); }} onError={(e) => setErr(e.message)} onClose={() => setConfirm(false)} />
    </div>
  );
}
