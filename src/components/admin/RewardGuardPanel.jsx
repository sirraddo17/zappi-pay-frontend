import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api';

// "Never give away more than X% of what I earn on a purchase."
export default function RewardGuardPanel() {
  const [on, setOn] = useState(true);
  const [pct, setPct] = useState('50');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then((d) => {
      const s = d.settings || d;
      setOn(s.rewardGuardEnabled !== false);
      setPct(String(s.rewardGuardPercent ?? 50));
    }).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await updateSettings({ rewardGuardEnabled: on, rewardGuardPercent: Number(pct) });
      setMsg(on ? `Saved — rewards on any purchase are limited to ${pct}% of what you earn on it.` : 'Saved — safety limit is off.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  const keep = 100 - Number(pct || 0);
  return (
    <form className="card" style={{ margin: '0 0 16px', maxWidth: 640, border: '1px solid var(--green-500, #22c55e)' }} onSubmit={save}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>🛡️ Giveaway safety limit</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 10px' }}>
        On any one purchase, your discount + promo code + cashback + loyalty points together can use at most this share of what you really earn on it (your markup + VTpass commission − Monnify's fee on the money the customer funded with). If they'd add up to more, the app gives a smaller promo discount, then less cashback, then fewer points — so a purchase never loses you money.
      </p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} /> Safety limit on
      </label>
      <div className="field">
        <label htmlFor="rg-pct">Most you can give away (% of your earnings on a purchase)</label>
        <input id="rg-pct" type="number" min="0" max="100" step="5" value={pct} disabled={!on} onChange={(e) => setPct(e.target.value)} />
        {on && (
          <small style={{ color: 'var(--slate-400)' }}>
            You always keep at least {keep}%. Example: on ₦1,000 MTN data you earn ₦30, so up to ₦{Math.floor((30 * Number(pct || 0)) / 100)} can go to rewards and you keep ₦{30 - Math.floor((30 * Number(pct || 0)) / 100)}.
          </small>
        )}
      </div>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 10px' }}>
        Your discount % below is shown to customers as a price, so it's never cut — keep it under the limit yourself. Wallet coupons, referral bonuses and contest prizes aren't tied to a purchase, so give them a usage limit or budget instead.
      </p>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save safety limit'}</button>
    </form>
  );
}
