import { useMemo, useState } from 'react';

// Data plans as tappable cards grouped into tabs (Daily / Weekly /
// Monthly …), like the big wallet apps. Groups come from the plan name
// VTpass sends ("MTN N1000 1.5GB - 30 days"), so new plans sort
// themselves; anything we can't read lands in "Others".

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString()}`;

function size(name) {
  const m = /(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/i.exec(name);
  return m ? { value: m[1], unit: m[2].toUpperCase() } : null;
}

// Validity in days (null when the name doesn't say).
export function validityDays(name) {
  const n = String(name || '').toLowerCase();
  // Bundles can mention several periods ("1GB + 1GB night … weekly"); the
  // plan lasts as long as the longest one.
  const found = [];
  const add = (re, mul) => { for (const m of n.matchAll(re)) found.push(Math.max(1, Math.round(Number(m[1]) * mul))); };
  add(/(\d+)\s*-?\s*(?:hrs?|hours?)\b/g, 1 / 24);
  add(/(\d+)\s*-?\s*(?:days?|dys?)\b/g, 1);
  add(/(\d+)\s*-?\s*(?:weeks?|wks?)\b/g, 7);
  add(/(\d+)\s*-?\s*(?:months?|mnths?)\b/g, 30);
  add(/(\d+)\s*-?\s*(?:years?|yrs?)\b/g, 365);
  if (/\bdaily\b/.test(n)) found.push(1);
  if (/\bweekly\b/.test(n)) found.push(7);
  if (/\bmonthly\b/.test(n)) found.push(30);
  if (/\byearly\b|\bannual\b/.test(n)) found.push(365);
  return found.length ? Math.max(...found) : null;
}

function special(name) {
  const n = String(name || '').toLowerCase();
  if (/night/.test(n)) return 'Night';
  if (/social|whatsapp|youtube|tiktok|instagram|facebook|\bfb\b/.test(n)) return 'Social';
  if (/router|broadband|unlimited/.test(n)) return 'Broadband';
  return null;
}

export function groupOf(name) {
  const sp = special(name);
  if (sp) return sp;
  const d = validityDays(name);
  if (d == null) return 'Others';
  if (d <= 2) return 'Daily';
  if (d <= 14) return 'Weekly';
  if (d <= 31) return 'Monthly';
  return '2 Months+';
}

const ORDER = ['Daily', 'Weekly', 'Monthly', '2 Months+', 'Night', 'Social', 'Broadband', 'Others'];

function validityLabel(name) {
  const d = validityDays(name);
  if (d == null) return '';
  if (d === 1) return '1 Day';
  if (d >= 365 && d % 365 === 0) return d === 365 ? '1 Year' : `${d / 365} Years`;
  if (d % 30 === 0 && d >= 30) return d === 30 ? '30 Days' : `${d / 30} Months`;
  return `${d} Days`;
}

// "Best value": cheapest per GB among the popular mid-size plans.
function perGb(v) {
  const s = size(v.name);
  if (!s) return Infinity;
  const gb = s.unit === 'TB' ? Number(s.value) * 1024 : s.unit === 'MB' ? Number(s.value) / 1024 : Number(s.value);
  return gb > 0 ? Number(v.variation_amount) / gb : Infinity;
}

export default function PlanGrid({ variations, value, onChange, priceOf }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const v of variations) {
      const g = groupOf(v.name);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(v);
    }
    for (const list of map.values()) list.sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount));
    return ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, plans: map.get(g) }));
  }, [variations]);
  const hot = useMemo(() => {
    const priced = variations.filter((v) => Number(v.variation_amount) >= 200 && Number(v.variation_amount) <= 5000 && perGb(v) < Infinity);
    return [...priced].sort((a, b) => perGb(a) - perGb(b)).slice(0, 6).sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount));
  }, [variations]);
  const tabs = [...(hot.length >= 3 ? [{ name: '🔥 Best value', plans: hot }] : []), ...groups, { name: 'All', plans: [...variations].sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount)) }];
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const current = tabs[Math.min(tab, tabs.length - 1)] || { plans: [] };
  const [all, setAll] = useState(false);
  const list = q.trim() ? variations.filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase())) : current.plans;
  const LIMIT = 12;
  const shown = all || q.trim() ? list : list.slice(0, LIMIT);
  const picked = variations.find((v) => v.variation_code === value);

  if (!variations.length) return <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading plans…</p>;
  return (
    <div className="plan-grid-wrap">
      <div className="plan-tabs" role="tablist" aria-label="Plan groups">
        {tabs.map((t, i) => (
          <button key={t.name} type="button" role="tab" aria-selected={i === tab && !q} className={`plan-tab${i === tab && !q ? ' on' : ''}`} onClick={() => { setTab(i); setQ(''); setAll(false); }}>
            {t.name}
          </button>
        ))}
      </div>
      {variations.length > 12 && (
        <input className="plan-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plans (e.g. 2GB, 30 days)" aria-label="Search plans" />
      )}
      <div className="plan-grid">
        {shown.map((v) => {
          const s = size(v.name);
          const p = priceOf(v.variation_amount);
          const on = v.variation_code === value;
          const save = Math.round(p.base - p.total);
          return (
            <button key={v.variation_code} type="button" className={`plan-card${on ? ' on' : ''}`} onClick={() => onChange(v.variation_code)} aria-pressed={on} title={v.name}>
              {save >= 5 && <span className="plan-save">Save {naira(save)}</span>}
              {on && <span className="plan-check" aria-hidden>✓</span>}
              {s ? <div className="plan-size">{s.value}<small>{s.unit}</small></div> : <div className="plan-size plan-size-text">{v.name.replace(/^\w+\s+(data\s+)?/i, '').slice(0, 28)}</div>}
              <div className="plan-valid">{validityLabel(v.name) || special(v.name) || '\u00a0'}</div>
              <div className="plan-price">{naira(p.total)}</div>
              {p.total < p.base && <s className="plan-old">{naira(p.base)}</s>}
            </button>
          );
        })}
        {shown.length === 0 && <p style={{ gridColumn: '1 / -1', color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No plans match.</p>}
      </div>
      {!all && !q.trim() && list.length > LIMIT && (
        <button type="button" className="plan-more" onClick={() => setAll(true)}>Show all {list.length} plans ▾</button>
      )}
      {picked && (
        <div className="plan-picked" role="status">
          <div style={{ minWidth: 0 }}>
            <b>{(() => { const z = size(picked.name); return z ? `${z.value}${z.unit}` : 'Plan'; })()}</b>
            {validityLabel(picked.name) && <span> · {validityLabel(picked.name)}</span>}
            <div className="plan-picked-name">{picked.name}</div>
          </div>
          <button type="button" className="plan-picked-go" onClick={() => document.querySelector('form button[type=submit]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            {naira(priceOf(picked.variation_amount).total)} ›
          </button>
        </div>
      )}
    </div>
  );
}

// Quick airtime amounts, showing what the wallet is charged.
export function AmountGrid({ amounts, value, onPick, priceOf }) {
  return (
    <div className="plan-grid" style={{ marginBottom: 10 }}>
      {amounts.map((a) => {
        const p = priceOf(a);
        const on = Number(value) === a;
        return (
          <button key={a} type="button" className={`plan-card${on ? ' on' : ''}`} onClick={() => onPick(String(a))} aria-pressed={on}>
            <div className="plan-size">{naira(a)}</div>
            <div className="plan-price" style={{ fontSize: 12 }}>{p.total < a ? <>Pay {naira(p.total)}</> : p.total > a ? <>Pay {naira(p.total)}</> : ' '}</div>
          </button>
        );
      })}
    </div>
  );
}
