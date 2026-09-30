import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findDataDeals } from '../api';
import { useAuth } from '../context/AuthContext';

const BUDGETS = [300, 500, 1000, 2000, 5000];
const NETWORKS = ['ALL', 'MTN', 'Airtel', 'Glo', '9mobile'];
const VALIDITY = [['', 'Any length'], ['DAY', '1–2 days'], ['WEEK', 'Week-ish'], ['MONTH', 'Month'], ['LONG', 'Longer']];
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const size = (mb) => (mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10}GB` : `${mb}MB`);
const days = (d) => (!d ? '' : d === 1 ? '1 day' : d % 30 === 0 && d >= 30 ? `${d / 30} month${d === 30 ? '' : 's'}` : `${d} days`);

function Chip({ on, children, onClick }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${on ? 'var(--purple)' : 'var(--slate-700)'}`, background: on ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)' }}>
      {children}
    </button>
  );
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
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>Best data for your budget</h1>
        <p>We check every network’s plans at your price</p>
      </div>
      <div className="card">
        <div className="field">
          <label htmlFor="deal-budget">My budget (₦)</label>
          <input id="deal-budget" type="number" inputMode="numeric" min="50" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
            {BUDGETS.map((b) => <Chip key={b} on={Number(budget) === b} onClick={() => setBudget(String(b))}>{naira(b)}</Chip>)}
          </div>
        </div>
        <div className="field">
          <label htmlFor="deal-phone">For this number (optional)</label>
          <input id="deal-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setNetwork(''); }} placeholder="080…" />
          {data?.guessedNetwork && !network && <small style={{ color: 'var(--slate-400)' }}>Looks like {data.guessedNetwork}. Moved your number to another network? Pick it below.</small>}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8 }}>
          {NETWORKS.map((n) => <Chip key={n} on={shownNet === n} onClick={() => setNetwork(n)}>{n === 'ALL' ? 'All networks' : n}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {VALIDITY.map(([k, l]) => <Chip key={k || 'any'} on={validity === k} onClick={() => setValidity(k)}>{l}</Chip>)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: 8 }}>
        <span className="section-label" style={{ padding: 0, margin: 0 }}>{busy ? 'Checking plans…' : data ? `${data.plans.length} plan${data.plans.length === 1 ? '' : 's'} within ${naira(data.budget)}` : ''}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip on={sort === 'MOST'} onClick={() => setSort('MOST')}>Most data</Chip>
          <Chip on={sort === 'VALUE'} onClick={() => setSort('VALUE')}>Best value</Chip>
        </div>
      </div>

      {err && <p className="error-text" style={{ margin: '0 16px 8px' }}>{err}</p>}
      {data && !data.plans.length && !busy && <p className="empty-state">No plans fit that budget. Try a bit more, or another network.</p>}
      {data?.plans?.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {data.plans.map((p, i) => (
            <div key={`${p.serviceID}-${p.variationCode}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--slate-700)' : 'none', minWidth: 0 }}>
              <div style={{ width: 64, flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{size(p.mb)}</div>
                <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{p.network}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                  {days(p.days) && `${days(p.days)} · `}{naira(p.perGb)}/GB
                  {p.bestValue && <span style={{ marginLeft: 6, color: 'var(--green-500)', fontWeight: 700 }}>Best value</span>}
                </div>
              </div>
              <button type="button" className="btn" style={{ width: 'auto', flexShrink: 0, padding: '6px 12px', fontSize: 13 }} onClick={() => buy(p)}>
                {naira(p.price)}
              </button>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 16px' }}>Prices include our fee and any discount you get. Plan names come from the networks.</p>
    </div>
  );
}
