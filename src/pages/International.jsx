import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { intlCountries, intlTypes, intlOperators, intlVariations, intlQuote, purchase } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { useAppInfo, pausedFor } from '../components/ServiceNotices';
import { SvcHero, Step, Summary, Trust } from '../components/ServiceKit';

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
  const [raw, setRaw] = useState(null);
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
  useEffect(() => { if (op && type) { setVars(null); setVcode(''); intlVariations(op, type).then((d) => { setVars(d.variations); setRaw(d.raw || null); if (d.variations.length === 1) setVcode(d.variations[0].code); }).catch((e) => setErr(e.message)); } }, [op]);

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
      <SvcHero icon="🌍" color="#1d4ed8" title="International airtime & data" sub="Top up family and friends abroad — pay in naira from your wallet." steps={['Pick the country', 'Choose network & amount', 'Delivered in seconds']} />
      {appInfo && !appInfo.intlAirtime && <div className="card" style={{ textAlign: 'center' }}>🌍 International airtime & data is coming soon.</div>}
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {paused && <p className="error-text" style={{ margin: '0 16px 12px' }}>{paused}</p>}

      {appInfo && !appInfo.intlAirtime ? null : !country ? (
        <div className="card">
          <input id="inQ" className="plan-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search country e.g. Ghana, UK, USA" aria-label="Which country?" />
          {!countries ? <p className="empty-state">Loading countries…</p> : (
            <>
              {!q && (
                <>
                  <div className="svc-step-h">Popular</div>
                  <div className="ctry-pop">
                    {shown.slice(0, 8).map((c) => (
                      <button key={c.code} type="button" onClick={() => setCountry(c)}>
                        {c.flag ? <img src={c.flag} alt="" /> : <span style={{ fontSize: 20 }}>🌍</span>}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.name.replace(/United Kingdom.*/i, 'UK').replace(/United States.*/i, 'USA').replace(/United Arab Emirates/i, 'UAE')}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="ctry-list">
                {(q ? shown : shown.slice(8)).map((c) => (
                  <button key={c.code} type="button" className="ctry-row" onClick={() => setCountry(c)}>
                    {c.flag ? <img src={c.flag} alt="" width="26" height="18" /> : '🌍'} {c.name} <span>+{c.prefix} ›</span>
                  </button>
                ))}
              </div>
              {q && shown.length === 0 && <p className="empty-state">No country found.</p>}
            </>
          )}
        </div>
      ) : (
        <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setConfirm(true); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b>{country.flag && <img src={country.flag} alt="" width="22" height="16" style={{ verticalAlign: 'middle', marginRight: 6 }} />}{country.name}</b>
            <button type="button" onClick={() => setCountry(null)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer' }}>Change</button>
          </div>
          {types.length > 1 && (
            <div className="seg2">
              {types.map((t) => <button key={t.id} type="button" className={type === t.id ? 'on' : ''} onClick={() => setType(t.id)}>{/data/i.test(t.name) ? '📶 ' : '📞 '}{t.name}</button>)}
            </div>
          )}
          {type && (
            <Step n={1} title="Network">
              {ops.length ? (
                <div className="prov-chips" role="radiogroup" aria-label="Network">
                  {ops.map((o) => {
                    let h = 0; for (const ch of String(o.name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
                    return (
                      <button key={o.id} type="button" role="radio" aria-checked={op === o.id} className={`prov-chip${op === o.id ? ' on' : ''}`} onClick={() => setOp(o.id)}>
                        <span className="prov-badge" style={{ background: `hsl(${h} 60% 38%)` }}>{String(o.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 4)}</span>{o.name}
                      </button>
                    );
                  })}
                </div>
              ) : <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>Loading networks…</p>}
            </Step>
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
          {vars && vars.length === 0 && raw && (
            <details style={{ fontSize: 11, color: 'var(--slate-400)', marginBottom: 10 }}>
              <summary>Details for support</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(raw, null, 1)}</pre>
            </details>
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
          {price && <Summary rows={[['Country', country.name], ['Sending', v.name], !v.fixed && ['They get', `${local} ${country.currency || ''}`], phone && ['To', `+${fullPhone}`]].filter(Boolean)} total={naira(price)} />}
          <button className="btn" type="submit" style={{ marginTop: 12 }} disabled={busy || !price || phone.replace(/\D/g, '').length < 6 || Boolean(paused)}>{price ? `Pay ${naira(price)}` : 'Pay'}</button>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Check the number carefully — international top-ups can’t be reversed once delivered. If it fails, you’re refunded automatically.</p>
        </form>
      )}

      <PinConfirm
        open={confirm}
        details={v ? { rows: [['Country', country?.name || ''], ['Sending', v.name], ['To', `+${fullPhone}`]], total: naira(price), note: 'International top-ups can’t be reversed once delivered.' } : undefined}
        onSubmit={buy}
        onError={(e) => setErr(e.message || 'Purchase failed.')}
        onClose={() => setConfirm(false)}
      />
      <BottomNav />
    </div>
  );
}
