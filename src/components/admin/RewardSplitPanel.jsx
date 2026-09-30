import { useEffect, useState } from 'react';
import { getRewardSplit, saveRewardSplit } from '../../api';

const naira = (n) => { const v = Number(n || 0); return `₦${v.toLocaleString('en-NG', Number.isInteger(v) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
const TYPE = { CASHBACK: 'Cashback', LOYALTY: 'Loyalty redeemed', REFERRAL_BONUS: 'Referral bonuses', CHALLENGE_REWARD: 'Challenges', DELIVERY_BONUS: 'Delivery promise', SHOP_COMMISSION: 'Shop commission', CONTEST_PRIZE: 'Contest prizes', COUPON: 'Coupons' };
const HOW = {
  CASHBACK: 'Paid to the buyer on every purchase',
  LOYALTY: 'Points for the buyer on every purchase',
  REFERRAL: 'Saved in a pool that pays referral bonuses',
  CHALLENGES: 'Saved in a pool that pays challenge rewards',
  PROMISE: 'Saved in a pool that pays delivery-promise bonuses',
  SHOP: 'Paid to the agent when the sale came through their shop link',
};

// Settings → Rewards split: "give back X% of my earnings, shared out
// automatically".
export default function RewardSplitPanel() {
  const [d, setD] = useState(null);
  const [on, setOn] = useState(false);
  const [pct, setPct] = useState('30');
  const [shares, setShares] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() {
    getRewardSplit().then((x) => {
      setD(x);
      setOn(x.config.enabled);
      setPct(String(x.config.pct));
      setShares(x.config.shares);
    }).catch((e) => setErr(e.message));
  }
  useEffect(load, []);
  if (!d) return <div className="card">{err ? <p className="error-text">{err}</p> : 'Loading…'}</div>;

  const sum = Object.values(shares).reduce((a, b) => a + Number(b || 0), 0);
  // Example on a normal (non-shop) sale where you earn ₦100.
  const live = d.programmes.filter((p) => p.on && p.key !== 'SHOP' && Number(shares[p.key]) > 0);
  const liveTotal = live.reduce((a, p) => a + Number(shares[p.key]), 0);
  const give = (100 * Number(pct || 0)) / 100;

  async function save(e) {
    e.preventDefault();
    if (sum !== 100) { setErr(`The shares must add up to 100% (now ${sum}%).`); return; }
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await saveRewardSplit({ enabled: on, pct: Number(pct), shares: Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Number(v || 0)])) });
      setMsg(on ? `Saved — ${pct}% of what you earn on each purchase is now shared out automatically.` : 'Saved — the rewards split is off. Each reward uses its own settings again.');
      load();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" style={{ maxWidth: 680, border: on ? '1px solid var(--green-500)' : undefined }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🎁 Rewards split</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Give back one % of what you earn on each purchase (your markup + VTpass commission), shared automatically between your reward programmes. Anything switched off gives its share to the others. Discounts and promo codes count toward the same %, so you never give away more than you set.
      </p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, fontWeight: 600 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} /> Split rewards automatically
      </label>
      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="rs-pct">Give back (% of my earnings)</label>
        <input id="rs-pct" type="number" min="0" max="90" step="5" value={pct} onChange={(e) => setPct(e.target.value)} />
        <small style={{ color: 'var(--slate-400)' }}>You keep {100 - Number(pct || 0)}%.</small>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0' }}>How it’s shared <span style={{ color: sum === 100 ? 'var(--green-500)' : 'var(--red-500)', fontWeight: 400 }}>({sum}% of 100%)</span></div>
      <div style={{ border: '1px solid var(--slate-700)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        {d.programmes.map((p, i) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: i ? '1px solid var(--slate-700)' : 'none', opacity: p.on ? 1 : 0.6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label} {!p.on && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 400 }}>· {p.key === 'CHALLENGES' ? 'no challenge running' : 'off'} — share goes to the others</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{HOW[p.key]}{p.pool ? ` · pool now ${naira(d.pools[p.key])}` : ''}</div>
            </div>
            <input type="number" min="0" max="100" aria-label={`${p.label} share %`} value={shares[p.key] ?? 0} onChange={(e) => setShares({ ...shares, [p.key]: e.target.value })} style={{ width: 70, textAlign: 'right' }} />
            <span style={{ fontSize: 13 }}>%</span>
          </div>
        ))}
      </div>

      {liveTotal > 0 && (
        <p style={{ fontSize: 13, background: 'var(--slate-800)', borderRadius: 10, padding: '10px 12px', margin: '0 0 12px' }}>
          Example: on a purchase where you earn <b>₦100</b>, <b>{naira(give)}</b> is given back —{' '}
          {live.map((p) => `${p.label.toLowerCase()} ${naira(Math.floor((give * Number(shares[p.key])) / liveTotal * 100) / 100)}`).join(', ')} — and you keep <b>{naira(100 - give)}</b>.
        </p>
      )}

      {d.waitingReferrals > 0 && on && (
        <p style={{ fontSize: 12, color: 'var(--gold)', margin: '0 0 12px' }}>{d.waitingReferrals} referral bonus{d.waitingReferrals === 1 ? '' : 'es'} not paid yet (friends who haven’t bought yet, or waiting for the referral pool to fill). They pay automatically.</p>
      )}

      {d.month && (
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          <b>This month:</b> you earned {naira(d.month.earned)} on purchases · gave back {naira(d.month.rewardsPaid + d.month.discounts)} ({d.month.earned > 0 ? Math.round(((d.month.rewardsPaid + d.month.discounts) / d.month.earned) * 100) : 0}%)
          <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>
            {[...(d.month.discounts > 0 ? [`Discounts & promo codes ${naira(d.month.discounts)}`] : []), ...Object.entries(d.month.rewardsByType || {}).filter(([, v]) => v > 0).map(([k, v]) => `${TYPE[k] || k} ${naira(v)}`)].join(' · ') || 'Nothing given yet.'}
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 12px' }}>
        While this is on, the Giveaway safety limit uses this % instead, cashback and points amounts come from here (their own % settings are ignored), and referral bonuses, challenge rewards and delivery-promise bonuses are paid from their pools. Contest prizes and wallet coupons keep their own budgets.
      </p>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
