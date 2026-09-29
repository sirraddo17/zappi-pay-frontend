import { useEffect, useState } from 'react';
import { getSavingsOverview, updateSettings, runSavingsInterest } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Settings → Savings. Off until you name the licence / licensed partner
// it runs under — paying interest on customer money is regulated.
export default function SavingsPanel() {
  const [o, setO] = useState(null);
  const [on, setOn] = useState(false);
  const [rate, setRate] = useState('10');
  const [min, setMin] = useState('1000');
  const [max, setMax] = useState('500000');
  const [budget, setBudget] = useState('5000');
  const [partner, setPartner] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() {
    getSavingsOverview().then((d) => {
      setO(d);
      setOn(d.enabled);
      setRate(String(d.ratePct));
      setMin(String(d.minBalance));
      setMax(String(d.maxBalance));
      setBudget(String(d.dailyBudget));
      setPartner(d.partnerNote || '');
    }).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function save(e) {
    e.preventDefault();
    if (on && !o.enabled && !agree) {
      setErr('Tick the box to confirm you have the licence or a licensed partner.');
      return;
    }
    if (!on && o.enabled && !window.confirm('Turn savings off? No more interest will be paid and customers can’t add money. Everyone with savings will be told their money is safe and can be moved to their wallet.')) return;
    setBusy('save');
    setErr('');
    setMsg('');
    try {
      await updateSettings({ savingsEnabled: on, savingsRatePct: Number(rate), savingsMinBalance: Number(min), savingsMaxBalance: Number(max), savingsDailyBudget: Number(budget), savingsPartnerNote: partner });
      setMsg(on ? 'Saved. Interest is paid every night just after midnight.' : 'Saved. Savings is off.');
      setAgree(false);
      load();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy('');
    }
  }

  async function runNow() {
    if (!window.confirm('Pay today’s interest now? It still only pays once per day.')) return;
    setBusy('run');
    setErr('');
    try {
      const r = await runSavingsInterest();
      setMsg(r.message);
      load();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy('');
    }
  }

  if (!o) return <div className="card" style={{ maxWidth: 640 }}>{err ? <p className="error-text">{err}</p> : 'Loading…'}</div>;

  const r = Number(rate) || 0;
  const perDay = (bal) => Math.floor(((Math.min(bal, Number(max) || 0) * r) / 100 / 365) * 100) / 100;
  const stat = (label, value) => (
    <div style={{ flex: '1 1 140px', background: 'rgba(134,59,255,0.08)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <form className="card" style={{ maxWidth: 640 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🐖 Savings with daily interest</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Customers move money from their wallet into a savings pocket and earn interest every night, like OWealth or CashBox. The interest is paid by you.
      </p>
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red-500)', borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 12 }}>
        <b>Keep this off until you’re allowed to offer it.</b> In Nigeria, paying interest on money customers keep with you counts as taking deposits and needs a CBN licence (e.g. a microfinance bank) or a licensed partner who holds the money. Check with a lawyer first.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {stat('Customers’ savings held', naira(o.totalHeld))}
        {stat('Savers', o.savers)}
        {stat('Interest paid (30 days)', naira(o.paid30Days))}
        {stat('Interest cost per day now', naira(o.projectedDaily))}
      </div>
      {o.projectedDailyUncapped > o.projectedDaily && (
        <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: -4 }}>At {o.ratePct}% it would be {naira(o.projectedDailyUncapped)} a day — your daily budget is scaling everyone’s interest down.</p>
      )}

      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} /> Savings on
      </label>
      <div className="field">
        <label htmlFor="sv-partner">Licence or licensed partner this runs under (required to turn on)</label>
        <input id="sv-partner" value={partner} maxLength={300} onChange={(e) => setPartner(e.target.value)} placeholder="e.g. Partner: XYZ Microfinance Bank, agreement signed 1 Nov 2026" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sv-rate">Interest (% a year)</label>
          <input id="sv-rate" type="number" min="0.01" max="30" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sv-budget">Most interest paid per day, all customers (₦)</label>
          <input id="sv-budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sv-min">Earns from (₦)</label>
          <input id="sv-min" type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="sv-max">Earns up to (₦)</label>
          <input id="sv-max" type="number" min="1" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 10px' }}>
        At {r}% a year: ₦10,000 earns {naira(perDay(10000))} a day, ₦100,000 earns {naira(perDay(100000))} a day. Money above {naira(Number(max) || 0)} earns nothing. If the total for a day passes your budget, everyone gets a smaller share so you never pay more than {naira(Number(budget) || 0)} a day (0 = no limit).
      </p>
      {on && !o.enabled && (
        <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 10 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto' }} /> I have the licence or a licensed partner named above, and I understand the interest comes out of my money.
        </label>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save savings settings'}</button>
        {o.enabled && <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={Boolean(busy)} onClick={runNow}>{busy === 'run' ? 'Paying…' : 'Pay today’s interest now'}</button>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>
        Last paid: {o.lastRunDate || 'never'} · all time {naira(o.paidAllTime)}. If the server is asleep at midnight, it pays when it wakes up. Turning it off never locks anyone’s money — they can still move savings to their wallet.
      </p>
    </form>
  );
}
