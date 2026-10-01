import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { viewPayRequest, payPayRequest } from '../api';
import PinConfirm from '../components/PinConfirm';
import { setAfterLogin, clearAfterLogin } from '../lib/afterLogin';
import { shareRequest } from './Requests';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const EMOJI = { REQUEST: '💸', SPLIT: '🍽️', POOL: '🎁' };

// zappipay.com.ng/r/<token> — a "Pay me" link, split bill or group gift.
export default function RequestLink() {
  const { token } = useParams();
  const { customer, loading, refreshCustomer } = useAuth();
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [hide, setHide] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(null);
  const [payErr, setPayErr] = useState('');

  const load = () => viewPayRequest(token).then((d) => setR(d.request)).catch((e) => setErr(e.message));
  useEffect(() => { if (!loading) { load(); if (customer) clearAfterLogin(); } }, [loading, customer?.id, token]);

  function goLogin(to) {
    setAfterLogin(`/r/${token}`);
    navigate(to === 'signup' ? `/signup${r?.owner?.username ? `?ref=${encodeURIComponent(r.owner.username)}` : ''}` : '/login');
  }

  async function pay(auth) {
    const res = await payPayRequest(token, { amount: r.kind === 'POOL' ? Number(amount) : undefined, message: message.trim() || undefined, hideAmount: hide, ...auth });
    setConfirm(false);
    setDone(res.amount);
    setR(res.request);
    refreshCustomer?.().catch(() => {});
  }

  if (err) {
    return (
      <div className="app-shell" style={{ padding: 16 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: 0 }}>🔗</p>
          <p>{err}</p>
          <Link to="/" className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Open ZAPPI PAY</Link>
        </div>
      </div>
    );
  }
  if (!r || loading) return <div className="page-loading">Loading…</div>;

  const pct = r.kind === 'POOL' && r.target ? Math.min(100, Math.round((r.collected / r.target) * 100)) : r.kind === 'SPLIT' && r.slots ? Math.round((r.payments / r.slots) * 100) : null;
  const open = r.status === 'OPEN';
  const payAmount = r.kind === 'POOL' ? Number(amount) : r.amount;
  const canPay = customer && !r.isOwner && open && !(r.kind !== 'POOL' && r.youPaid) && r.owner.active;

  return (
    <div className="app-shell" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← ZAPPI PAY</Link>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>{EMOJI[r.kind]}</div>
        <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{r.kindLabel}</div>
        <h1 style={{ fontSize: 22, margin: '4px 0' }}>{r.title}</h1>
        <p style={{ margin: '0 0 6px', fontSize: 14 }}>
          from <b>{r.owner.name}</b> {r.owner.verified && <span title="Name confirmed with BVN/NIN" style={{ color: 'var(--green-500)', fontSize: 12 }}>✓ verified</span>}
          {r.owner.username && <span style={{ color: 'var(--slate-400)' }}> · @{r.owner.username}</span>}
        </p>
        {r.note && <p style={{ fontSize: 14, color: 'var(--slate-300, #cbd5e1)', whiteSpace: 'pre-wrap' }}>{r.note}</p>}
        {r.kind === 'REQUEST' && <div style={{ fontSize: 30, fontWeight: 700, margin: '8px 0' }}>{naira(r.amount)}</div>}
        {r.kind === 'SPLIT' && (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>{naira(r.amount)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--slate-400)' }}>your share</span></div>
            <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>Total {naira(r.total)} · {r.payments} of {r.slots} paid</div>
          </>
        )}
        {r.kind === 'POOL' && (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>{naira(r.collected)}</div>
            <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{r.target ? `raised of ${naira(r.target)}` : 'raised'} · {r.payments} contribution{r.payments === 1 ? '' : 's'}</div>
          </>
        )}
        {pct !== null && (
          <div style={{ height: 8, background: 'var(--slate-800)', borderRadius: 4, margin: '10px 0 0' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-500, #22c55e)', borderRadius: 4 }} />
          </div>
        )}
        {!open && <p style={{ marginTop: 12, fontWeight: 600, color: r.status === 'DONE' ? 'var(--green-500)' : 'var(--slate-400)' }}>{r.status === 'DONE' ? '✓ Paid in full' : r.status === 'EXPIRED' ? 'This link has expired.' : 'This link is closed.'}</p>}
      </div>

      {done && <div className="card" style={{ textAlign: 'center', border: '1px solid var(--green-500)' }}>✅ You paid <b>{naira(done)}</b> to {r.owner.name}. It’s in their wallet now.</div>}
      {payErr && <p className="error-text" style={{ margin: '0 16px 12px' }}>{payErr}</p>}

      {r.isOwner && (
        <div className="card">
          <b>This is your link.</b> Share it — people pay from their ZAPPI PAY wallet and the money comes straight to you.
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => shareRequest(r)}>Share link</button>
          <Link to="/requests" style={{ display: 'block', textAlign: 'center', marginTop: 10, color: 'var(--purple)', fontSize: 14 }}>See all my links ›</Link>
        </div>
      )}

      {!customer && open && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Log in to pay from your ZAPPI PAY wallet. New here? Sign up free — it takes a minute.</p>
          <button type="button" className="btn" onClick={() => goLogin('login')}>Log in to pay</button>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => goLogin('signup')}>Sign up</button>
        </div>
      )}

      {customer && !r.isOwner && open && r.kind !== 'POOL' && r.youPaid && <div className="card" style={{ textAlign: 'center' }}>✓ You’ve already paid your share.</div>}

      {canPay && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); setPayErr(''); setConfirm(true); }}>
          {r.kind === 'POOL' && (
            <div className="field">
              <label htmlFor="rqAmt">How much will you give? (₦)</label>
              <input id="rqAmt" type="number" inputMode="numeric" min="100" max="500000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {[1000, 2000, 5000, 10000].map((n) => <button key={n} type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setAmount(String(n))}>{naira(n)}</button>)}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="rqMsg">Message (optional)</label>
            <input id="rqMsg" maxLength={140} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={r.kind === 'POOL' ? 'e.g. Happy birthday! 🎉' : 'e.g. My share'} />
          </div>
          {r.kind === 'POOL' && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} style={{ width: 'auto' }} /> Hide my amount from others (the organiser still sees it)
            </label>
          )}
          <button className="btn" type="submit" disabled={r.kind === 'POOL' && !(Number(amount) >= 100)}>Pay {payAmount ? naira(payAmount) : ''}</button>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>🔒 Only pay people you know. ZAPPI PAY never asks you to pay to receive money or a prize.</p>
        </form>
      )}

      {r.paidBy.length > 0 && (
        <div className="card">
          <b style={{ fontSize: 14 }}>{r.kind === 'POOL' ? 'Contributors' : 'Paid'}</b>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {r.paidBy.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                <span>{p.name}{p.message ? <span style={{ color: 'var(--slate-400)' }}> — “{p.message}”</span> : ''}</span>
                <b>{p.amount === null ? '🎁' : naira(p.amount)}</b>
              </div>
            ))}
          </div>
          {r.isOwner && r.waitingFor?.length > 0 && <p style={{ fontSize: 13, color: 'var(--gold)', margin: '8px 0 0' }}>Still to pay: {r.waitingFor.join(', ')}</p>}
        </div>
      )}

      <PinConfirm
        open={confirm}
        summary={`Pay ${naira(payAmount)} to ${r.owner.name} · ${r.title}`}
        onSubmit={pay}
        onError={(e) => setPayErr(e.message || 'Payment failed.')}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
