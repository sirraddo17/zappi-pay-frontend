import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findDataDeals } from '../api';
import { useAuth } from '../context/AuthContext';
import { SvcHero, Step } from '../components/ServiceKit';
import { NETWORK_STYLE } from '../lib/network';
const NET_KEY = { MTN: 'mtn', Airtel: 'airtel', Glo: 'glo', '9mobile': 'etisalat' };

const BUDGETS = [300, 500, 1000, 2000, 5000];
const NETWORKS = ['ALL', 'MTN', 'Airtel', 'Glo', '9mobile'];
const VALIDITY = [['', 'Any length'], ['DAY', '1–2 days'], ['WEEK', 'Week-ish'], ['MONTH', 'Month'], ['LONG', 'Longer']];
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const size = (mb) => (mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10}GB` : `${mb}MB`);
const days = (d) => (!d ? '' : d === 1 ? '1 day' : d % 30 === 0 && d >= 30 ? `${d / 30} month${d === 30 ? '' : 's'}` : `${d} days`);

function Chip({ on, children, onClick }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={`plan-tab${on ? ' on' : ''}`}>{children}</button>;
}

// "I have ₦1,500 — what's the most data I can get?"
export default function Deals() {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const [budget, setBudget] = useState('1000');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [network, setNetwork] = useState('');
  const [validity, setValidity] = useState('');
  const [sort, setSort] = useState('MOST');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    const b = Number(budget);
    if (!(b >= 50)) { setData(null); return undefined; }
    const t = setTimeout(async () => {
      const mine = ++seq.current;
      setBusy(true);
      setErr('');
      try {
        const d = await findDataDeals({ budget: b, phone: phone.replace(/\D/g, '').length >= 4 ? phone : undefined, network: network || undefined, validity: validity || undefined, sort });
        if (mine === seq.current) setData(d);
      } catch (e) {
        if (mine === seq.current) setErr(e.message);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [budget, phone, network, validity, sort]);

  function buy(p) {
    const q = new URLSearchParams({ provider: p.serviceID, variation: p.variationCode });
    if (/^\d{10,}$/.test(phone.replace(/\D/g, ''))) q.set('recipient', phone.replace(/\D/g, ''));
    navigate(`/buy/data?${q.toString()}`);
  }

  const shownNet = network || data?.guessedNetwork || 'ALL';
  const plans = data?.plans || [];
  const bestPer = plans.length ? Math.min(...plans.map((p) => p.perGb || Infinity)) : 0;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <SvcHero icon="🔎" color="#a16207" title="Best data for your budget" sub="Tell us what you want to spend — we compare every network’s plans for you." />
      <div className="card">
        <Step title="My budget">
          <div className="amt-big" style={{ border: '1.5px solid var(--slate-700)', borderRadius: 14, padding: '6px 0', background: 'var(--slate-900)' }}>
            <span>₦</span>
            <input id="deal-budget" type="number" inputMode="numeric" min="50" value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="My budget" style={{ width: `${Math.max(1, String(budget || '0').length) + 0.6}ch` }} />
          </div>
          <div className="qty-chips">
            {BUDGETS.map((b) => <button key={b} type="button" className={`qty-chip${Number(budget) === b ? ' on' : ''}`} onClick={() => setBudget(String(b))}>{naira(b)}</button>)}
          </div>
        </Step>
        <Step title="For this number" right="optional">
          <input id="deal-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setNetwork(''); }} placeholder="080…" aria-label="Phone number" />
          {data?.guessedNetwork && !network && <small style={{ color: 'var(--slate-400)', display: 'block', marginTop: 4 }}>Looks like {data.guessedNetwork}. Ported? Pick the network below.</small>}
        </Step>
        <div className="plan-tabs" style={{ marginBottom: 8 }}>
          {NETWORKS.map((n) => <Chip key={n} on={shownNet === n} onClick={() => setNetwork(n)}>{n === 'ALL' ? 'All networks' : n}</Chip>)}
        </div>
        <div className="plan-tabs" style={{ marginBottom: 0 }}>
          {VALIDITY.map(([k, l]) => <Chip key={k || 'any'} on={validity === k} onClick={() => setValidity(k)}>{l}</Chip>)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', margin: '4px 0 8px', gap: 8 }}>
        <span className="section-label" style={{ padding: 0, margin: 0 }}>{busy ? 'Checking plans…' : data ? `${plans.length} plan${plans.length === 1 ? '' : 's'} within ${naira(data.budget)}` : ''}</span>
        <div className="seg2" style={{ margin: 0, padding: 3, width: 190 }}>
          <button type="button" className={sort === 'MOST' ? 'on' : ''} onClick={() => setSort('MOST')} style={{ padding: '6px 0', fontSize: 12 }}>Most data</button>
          <button type="button" className={sort === 'VALUE' ? 'on' : ''} onClick={() => setSort('VALUE')} style={{ padding: '6px 0', fontSize: 12 }}>Best value</button>
        </div>
      </div>

      {err && <p className="error-text" style={{ margin: '0 16px 8px' }}>{err}</p>}
      {data && !plans.length && !busy && <p className="empty-state">No plans fit that budget. Try a bit more, or another network.</p>}
      {plans.length > 0 && (
        <div className="vplan-list" style={{ margin: '0 16px' }}>
          {plans.map((p) => {
            const st = NETWORK_STYLE[NET_KEY[p.network]];
            const best = p.bestValue || (bestPer && p.perGb <= bestPer + 0.01);
            return (
              <button key={`${p.serviceID}-${p.variationCode}`} type="button" className={`vplan${best ? ' best' : ''}`} onClick={() => buy(p)} title={p.name}>
                <div className="vplan-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span className="prov-badge" style={{ background: st?.bg || 'var(--slate-700)', color: st?.fg || '#fff', minWidth: 34, height: 34, borderRadius: '50%', fontSize: 9 }}>{(st?.name || p.network).slice(0, 4)}</span>
                    <span><span className="vplan-gb">{size(p.mb).replace(/(GB|MB)$/, '')}<small>{/GB$/.test(size(p.mb)) ? 'GB' : 'MB'}</small></span><span className="vplan-valid">{days(p.days)}</span></span>
                  </div>
                  <div className="vplan-price">{naira(p.price)}</div>
                </div>
                <div className="vplan-meta">{naira(p.perGb)} per GB{best && <> · <b>🏆 Best value</b></>}</div>
                {bestPer > 0 && p.perGb > 0 && <div className="vplan-bar" aria-hidden><i style={{ width: `${Math.min(100, Math.max(8, Math.round((bestPer / p.perGb) * 100)))}%` }} /></div>}
              </button>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 16px' }}>Prices include our fee and any discount you get. Plan names come from the networks.</p>
    </div>
  );
}
