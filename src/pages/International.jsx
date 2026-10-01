import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { intlCountries, intlTypes, intlOperators, intlVariations, intlQuote, purchase } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { useAppInfo, pausedFor } from '../components/ServiceNotices';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const POPULAR = ['GH', 'GB', 'US', 'CA', 'KE', 'ZA', 'CM', 'BJ', 'TG', 'AE', 'IE', 'DE'];

// More → International airtime & data (VTpass foreign-airtime).
export default function International() {
  const { refreshCustomer } = useAuth();
  const appInfo = useAppInfo();
  const navigate = useNavigate();
  const [countries, setCountries] = useState(null);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState(null);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [ops, setOps] = useState([]);
  const [op, setOp] = useState('');
  const [vars, setVars] = useState(null);
  const [vcode, setVcode] = useState('');
  const [local, setLocal] = useState('');
  const [quote, setQuote] = useState(null);
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { intlCountries().then((d) => setCountries(d.countries)).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { if (country) { setTypes([]); setType(''); setOps([]); setOp(''); setVars(null); intlTypes(country.code).then((d) => { setTypes(d.types); if (d.types.length === 1) setType(d.types[0].id); }).catch((e) => setErr(e.message)); } }, [country]);
  useEffect(() => { if (country && type) { setOps([]); setOp(''); setVars(null); intlOperators(country.code, type).then((d) => { setOps(d.operators); if (d.operators.length === 1) setOp(d.operators[0].id); }).catch((e) => setErr(e.message)); } }, [type]);
  useEffect(() => { if (op && type) { setVars(null); setVcode(''); intlVariations(op, type).then((d) => { setVars(d.variations); if (d.variations.length === 1) setVcode(d.variations[0].code); }).catch((e) => setErr(e.message)); } }, [op]);

  const v = vars?.find((x) => x.code === vcode);
  useEffect(() => {
    setQuote(null);
    if (!v || v.fixed || !(Number(local) > 0)) return undefined;
    const t = setTimeout(() => intlQuote({ code: country.code, type, operator: op, variation: v.code, amount: local }).then((d) => setQuote(d.price)).catch((e) => setQuote({ error: e.message })), 400);
    return () => clearTimeout(t);
  }, [vcode, local]);

  const price = v ? (v.fixed ? v.price : typeof quote === 'number' ? quote : null) : null;
  const fullPhone = country ? `${country.prefix}${phone.replace(/\D/g, '').replace(/^0+/, '')}` : '';
  const shown = useMemo(() => {
    const all = countries || [];
    const s = q.trim().toLowerCase();
    if (s) return all.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s);
    return [...POPULAR.map((code) => all.find((c) => c.code === code)).filter(Boolean)];
  }, [countries, q]);
  const paused = pausedFor(appInfo, 'INTERNATIONAL');

  async function buy(auth) {
    setBusy(true);
    try {
      const res = await purchase({ service: 'INTERNATIONAL', serviceID: 'foreign-airtime', variationCode: v.code, billersCode: fullPhone, phone: fullPhone, intl: { countryCode: country.code, productTypeId: type, operatorId: op, localAmount: v.fixed ? undefined : Number(local) }, ...auth });
      await refreshCustomer();
      setConfirm(false);
      navigate(res?.order?.id ? `/orders/${res.order.id}` : '/orders');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/more" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>International airtime & data</h1>
        <p>Top up family and friends abroad — pay in naira from your wallet.</p>
      </div>
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {paused && <p className="error-text" style={{ margin: '0 16px 12px' }}>{paused}</p>}

      {!country ? (
        <div className="card">
          <div className="field"><label htmlFor="inQ">Which country?</label><input id="inQ" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. Ghana, UK, USA" /></div>
          {!countries ? <p className="empty-state">Loading countries…</p> : (
            <div style={{ display: 'grid', gap: 6 }}>
              {!q && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Popular</div>}
              {shown.map((c) => (
                <button key={c.code} type="button" className="btn btn-secondary" style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => setCountry(c)}>
                  {c.flag ? <img src={c.flag} alt="" width="22" height="16" style={{ objectFit: 'cover', borderRadius: 2 }} /> : '🌍'} {c.name} <span style={{ color: 'var(--slate-400)', marginLeft: 'auto' }}>+{c.prefix}</span>
                </button>
              ))}
              {q && shown.length === 0 && <p className="empty-state">No country found.</p>}
            </div>
          )}
        </div>
      ) : (
        <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setConfirm(true); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b>{country.flag && <img src={country.flag} alt="" width="22" height="16" style={{ verticalAlign: 'middle', marginRight: 6 }} />}{country.name}</b>
            <button type="button" onClick={() => setCountry(null)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer' }}>Change</button>
          </div>
          {types.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {types.map((t) => <button key={t.id} type="button" className={type === t.id ? 'btn' : 'btn btn-secondary'} onClick={() => setType(t.id)}>{/data/i.test(t.name) ? '📶 ' : '📞 '}{t.name}</button>)}
            </div>
          )}
          {type && (
            <div className="field">
              <label htmlFor="inOp">Network</label>
              <select id="inOp" value={op} onChange={(e) => setOp(e.target.value)} required>
                <option value="">{ops.length ? 'Choose network' : 'Loading…'}</option>
                {ops.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
          {op && (
            <div className="field">
              <label htmlFor="inV">What to send</label>
              <select id="inV" value={vcode} onChange={(e) => setVcode(e.target.value)} required>
                <option value="">{vars === null ? 'Loading…' : vars.length ? 'Choose' : 'Nothing available for this network'}</option>
                {(vars || []).map((x) => <option key={x.code} value={x.code}>{x.name}{x.fixed && x.price ? ` — ${naira(x.price)}` : ''}</option>)}
              </select>
            </div>
          )}
          {v && !v.fixed && (
            <div className="field">
              <label htmlFor="inL">Amount in {country.currency || 'local money'}{v.min ? ` (${v.min}–${v.max})` : ''}</label>
              <input id="inL" type="number" inputMode="decimal" min={v.min || 0} max={v.max || undefined} step="any" value={local} onChange={(e) => setLocal(e.target.value)} required />
              {quote?.error && <small className="error-text">{quote.error}</small>}
            </div>
          )}
          {v && (
            <div className="field">
              <label htmlFor="inPh">Their phone number</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ padding: '10px 8px', background: 'var(--slate-800)', borderRadius: 8 }}>+{country.prefix}</span>
                <input id="inPh" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Number without the country code" required style={{ flex: 1 }} />
              </div>
            </div>
          )}
          {price && <p style={{ fontSize: 15, margin: '4px 0 10px' }}>You pay <b>{naira(price)}</b></p>}
          <button className="btn" type="submit" disabled={busy || !price || phone.replace(/\D/g, '').length < 6 || Boolean(paused)}>{price ? `Pay ${naira(price)}` : 'Pay'}</button>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Check the number carefully — international top-ups can’t be reversed once delivered. If it fails, you’re refunded automatically.</p>
        </form>
      )}

      <PinConfirm
        open={confirm}
        summary={v ? `Pay ${naira(price)} · ${v.name} to +${fullPhone}` : ''}
        onSubmit={buy}
        onError={(e) => setErr(e.message || 'Purchase failed.')}
        onClose={() => setConfirm(false)}
      />
      <BottomNav />
    </div>
  );
}
