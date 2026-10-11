import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insurancePlans, insuranceOptions, purchase } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { useAppInfo, pausedFor } from '../components/ServiceNotices';
import { SvcHero, Step, Summary, Trust } from '../components/ServiceKit';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const PLAN_EMOJI = { private: '🚗', commercial: '🚌', tricycle: '🛺', motorcycle: '🏍️' };
const emojiFor = (name) => PLAN_EMOJI[Object.keys(PLAN_EMOJI).find((k) => String(name).toLowerCase().includes(k.slice(0, 6)))] || '🚘';

function Pick({ id, label, kind, parent, value, onChange, disabled }) {
  const [opts, setOpts] = useState(null);
  const [info, setInfo] = useState(null);
  useEffect(() => {
    setOpts(null);
    setInfo(null);
    if (disabled) return;
    insuranceOptions(kind, parent).then((d) => { setOpts(d.options); if (!d.options.length) setInfo(d.raw || { note: 'empty list' }); }).catch((e) => { setOpts([]); setInfo({ error: e.message }); });
  }, [kind, parent, disabled]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required disabled={disabled}>
        <option value="">{disabled ? 'Choose the one above first' : opts === null ? 'Loading…' : opts.length ? 'Choose' : 'Nothing found'}</option>
        {(opts || []).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
      </select>
      {info && (
        <details style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
          <summary>{info.error ? `Could not load: ${info.error}` : 'Nothing came back — details for support'}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify({ list: kind, parent, ...info }, null, 1)}</pre>
        </details>
      )}
    </div>
  );
}

// More → Car insurance: third-party motor insurance (Universal Insurance via VTpass).
export default function Insurance() {
  const { customer, refreshCustomer } = useAuth();
  const appInfo = useAppInfo();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [plan, setPlan] = useState('');
  const [f, setF] = useState({ insuredName: customer?.name || '', plateNumber: '', chassisNumber: '', yearOfMake: '', vehicleMake: '', vehicleModel: '', vehicleColor: '', engineCapacity: '', state: '', lga: '', email: customer?.email || '' });
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === 'string' ? v : v.target.value, ...(k === 'vehicleMake' ? { vehicleModel: '' } : {}), ...(k === 'state' ? { lga: '' } : {}) }));
  useEffect(() => { insurancePlans().then((d) => { setPlans(d.plans); if (d.plans[0]) setPlan(d.plans[0].code); }).catch((e) => setErr(e.message)); }, []);
  const p = plans?.find((x) => x.code === plan);
  const paused = pausedFor(appInfo, 'INSURANCE');

  async function buy(auth) {
    const res = await purchase({ service: 'INSURANCE', serviceID: 'ui-insure', variationCode: plan, billersCode: f.plateNumber, phone: customer?.phone || '', insurance: f, ...auth });
    await refreshCustomer();
    setConfirm(false);
    navigate(res?.order?.id ? `/orders/${res.order.id}` : '/orders');
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <SvcHero icon="🚗" color="#c2410c" title="Car insurance" sub="Third-party motor insurance — required by law. Certificate by email in minutes." steps={['Pick your vehicle', 'Enter its papers', 'Get your certificate']} />
      {err && <p className="error-text" style={{ margin: '0 16px 12px' }}>{err}</p>}
      {paused && <p className="error-text" style={{ margin: '0 16px 12px' }}>{paused}</p>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setConfirm(true); }}>
        <Step n={1} title="Vehicle type">
          {plans === null ? <SkeletonRows rows={2} /> : (
            <div className="veh-grid" role="radiogroup">
              {plans.map((x) => (
                <button key={x.code} type="button" role="radio" aria-checked={plan === x.code} className={`veh-tile${plan === x.code ? ' on' : ''}`} onClick={() => setPlan(x.code)}>
                  <span aria-hidden>{emojiFor(x.name)}</span>
                  <span style={{ minWidth: 0 }}><b>{x.name.replace(/\s*\(.*?\)/g, '')}</b><small>{x.price ? naira(x.price) : ''}<span style={{ color: 'var(--slate-400)', fontWeight: 500, fontSize: 11 }}>{x.price ? ' / year' : ''}</span></small></span>
                </button>
              ))}
            </div>
          )}
        </Step>
        <Step n={2} title="Vehicle papers"><span /></Step>
        <div className="field"><label htmlFor="isN">Owner’s full name (as on vehicle papers)</label><input id="isN" maxLength={80} value={f.insuredName} onChange={set('insuredName')} required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label htmlFor="isP">Plate number</label><input id="isP" maxLength={12} value={f.plateNumber} onChange={(e) => set('plateNumber')(e.target.value.toUpperCase())} placeholder="ABC123XY" required /></div>
          <div className="field"><label htmlFor="isY">Year of make</label><input id="isY" type="number" inputMode="numeric" min="1960" max={new Date().getFullYear() + 1} value={f.yearOfMake} onChange={set('yearOfMake')} required /></div>
        </div>
        <div className="field"><label htmlFor="isC">Chassis number (VIN)</label><input id="isC" maxLength={30} value={f.chassisNumber} onChange={(e) => set('chassisNumber')(e.target.value.toUpperCase())} placeholder="On the vehicle licence / particulars" required /></div>
        <Pick id="isMk" label="Make" kind="brand" value={f.vehicleMake} onChange={set('vehicleMake')} />
        <Pick id="isMd" label="Model" kind="model" parent={f.vehicleMake} value={f.vehicleModel} onChange={set('vehicleModel')} disabled={!f.vehicleMake} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Pick id="isCo" label="Colour" kind="color" value={f.vehicleColor} onChange={set('vehicleColor')} />
          <Pick id="isEc" label="Engine capacity" kind="engine-capacity" value={f.engineCapacity} onChange={set('engineCapacity')} />
        </div>
        <Step n={3} title="Where it’s registered"><span /></Step>
        <Pick id="isSt" label="State" kind="state" value={f.state} onChange={set('state')} />
        <Pick id="isL" label="Local government" kind="lga" parent={f.state} value={f.lga} onChange={set('lga')} disabled={!f.state} />
        <div className="field"><label htmlFor="isE">Email (certificate is sent here)</label><input id="isE" type="email" value={f.email} onChange={set('email')} required /></div>
        {p?.price > 0 && <Summary rows={[['Cover', `${p.name} · third party`], ['Plate', f.plateNumber || '—'], ['Lasts', '1 year']]} total={naira(p.price)} />}
        <button className="btn" type="submit" style={{ marginTop: 12 }} disabled={!p?.price || Boolean(paused)}>{p?.price ? `Pay ${naira(p.price)}` : 'Pay'}</button>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Third-party cover pays for damage you cause to other people’s vehicles or property and their injuries. It does not cover your own car. Cover lasts one year. If the purchase fails, you’re refunded automatically.</p>
      </form>
      <PinConfirm
        open={confirm}
        details={p ? { rows: [['Cover', `${p.name} · third party`], ['Plate', f.plateNumber], ['Owner', f.insuredName], ['Certificate to', f.email]], total: naira(p.price) } : undefined}
        onSubmit={buy}
        onError={(e) => setErr(e.message || 'Purchase failed.')}
        onClose={() => setConfirm(false)}
      />
      <BottomNav />
    </div>
  );
}
