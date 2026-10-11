import { useEffect, useMemo, useState } from 'react';

// Visual pickers for bill services (light, TV, exam PINs, internet,
// bet funding): provider tiles with a coloured badge, and package cards.
// Badges use the provider's short name — no third-party logos.

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString()}`;

// Short name + colour per provider (VTpass serviceID), with a sensible
// fallback for anything new.
const BADGE = {
  'ikeja-electric': ['IE', '#e11d48'], 'eko-electric': ['EKO', '#0ea5e9'], 'abuja-electric': ['AEDC', '#16a34a'],
  'kano-electric': ['KEDCO', '#f59e0b'], 'portharcourt-electric': ['PHED', '#2563eb'], 'jos-electric': ['JED', '#9333ea'],
  'kaduna-electric': ['KAEDCO', '#0d9488'], 'enugu-electric': ['EEDC', '#dc2626'], 'ibadan-electric': ['IBEDC', '#ea580c'],
  'benin-electric': ['BEDC', '#059669'], 'aba-electric': ['ABA', '#7c2d12'], 'yola-electric': ['YEDC', '#4f46e5'],
  dstv: ['DStv', '#0284c7'], gotv: ['GOtv', '#16a34a'], startimes: ['Star', '#f97316'], showmax: ['SMax', '#111827'],
  waec: ['WAEC', '#15803d'], 'waec-registration': ['WAEC', '#166534'], jamb: ['JAMB', '#1d4ed8'], neco: ['NECO', '#b45309'],
  'smile-direct': ['Smile', '#db2777'], spectranet: ['Spec', '#7c3aed'],
};
function badge(p) {
  const id = String(p.serviceID || '').toLowerCase();
  if (BADGE[id]) return BADGE[id];
  const key = Object.keys(BADGE).find((k) => id.startsWith(k));
  if (key) return BADGE[key];
  const short = (String(p.name || id).match(/\b[A-Z]{2,6}\b/) || [String(p.name || id).slice(0, 4)])[0];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return [short, `hsl(${h} 65% 38%)`];
}
// "Ikeja Electric Payment" → "Ikeja Electric"; "KEDCO - Kano Electric" → "Kano Electric".
function cleanName(name) {
  let s = String(name || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\b(payment|subscription|vending|disco)\b/gi, '').trim();
  const parts = s.split(/\s+[-–]\s+/);
  if (parts.length > 1) s = parts.sort((a, b) => b.length - a.length)[0];
  s = s.replace(/\bElectricity Distribution Company\b/i, 'Electric').replace(/[-–]\s*$/, '').replace(/\s+/g, ' ').trim();
  // "DSTV" → "DStv", "Gotv" → "GOtv"
  return s.replace(/^dstv$/i, 'DStv').replace(/^gotv$/i, 'GOtv').replace(/^showmax$/i, 'Showmax');
}

export function ProviderGrid({ providers, value, onChange, label }) {
  const [q, setQ] = useState('');
  const list = q.trim() ? providers.filter((p) => `${p.name} ${p.serviceID}`.toLowerCase().includes(q.trim().toLowerCase())) : providers;
  return (
    <div>
      {providers.length > 8 && <input className="plan-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()} (e.g. Ikeja, IBEDC)`} aria-label={`Search ${label}`} />}
      <div className="prov-grid" role="radiogroup" aria-label={label}>
        {list.map((p) => {
          const [short, color] = badge(p);
          const on = p.serviceID === value;
          return (
            <button key={p.serviceID} type="button" role="radio" aria-checked={on} className={`prov-card${on ? ' on' : ''}`} onClick={() => onChange(p.serviceID)} title={p.name}>
              <span className="prov-badge" style={{ background: color }}>{short}</span>
              <span className="prov-name">{cleanName(p.name)}</span>
              {on && <span className="plan-check" aria-hidden>✓</span>}
            </button>
          );
        })}
        {list.length === 0 && <p style={{ gridColumn: '1 / -1', color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No match.</p>}
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text, sub]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={`seg-btn${value === v ? ' on' : ''}`} onClick={() => onChange(v)}>
          {text}{sub && <small>{sub}</small>}
        </button>
      ))}
    </div>
  );
}

// Package / exam cards in one column: name, period, price.
function period(name) {
  const n = String(name || '').toLowerCase();
  if (/year|annual|12\s*months?/.test(n)) return 'Yearly';
  if (/quarter|3\s*months?/.test(n)) return 'Quarterly';
  if (/week/.test(n)) return 'Weekly';
  if (/day/.test(n) && !/monthly/.test(n)) return 'Daily';
  return null;
}
function tidy(name) {
  return String(name || '').replace(/\s*[-–]\s*(monthly|quarterly|yearly)\b/i, '').replace(/\s*N[\d,]+(\.\d+)?\s*$/i, '').replace(/\s+/g, ' ').trim();
}
export function PackageList({ variations, value, onChange, priceOf, kind }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const v of variations) { const g = period(v.name) || 'Monthly'; if (!m.has(g)) m.set(g, []); m.get(g).push(v); }
    return ['Monthly', 'Quarterly', 'Yearly', 'Weekly', 'Daily'].filter((g) => m.has(g)).map((g) => ({ g, list: m.get(g).sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount)) }));
  }, [variations]);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  // Only one choice (e.g. WAEC result checker) — pick it for them.
  useEffect(() => {
    if (variations.length === 1 && value !== variations[0].variation_code) onChange(variations[0].variation_code);
  }, [variations]);
  if (!variations.length) return <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>;
  const tabs = groups.length > 1 ? [{ g: 'All', list: [...variations].sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount)) }, ...groups] : groups;
  const cur = tabs[Math.min(tab, tabs.length - 1)];
  const shown = q.trim() ? variations.filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase())) : cur.list;
  return (
    <div>
      {tabs.length > 1 && (
        <div className="plan-tabs" role="tablist">
          {tabs.map((t, i) => <button key={t.g} type="button" role="tab" aria-selected={i === tab && !q} className={`plan-tab${i === tab && !q ? ' on' : ''}`} onClick={() => { setTab(i); setQ(''); }}>{t.g}</button>)}
        </div>
      )}
      {variations.length > 10 && <input className="plan-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === 'cable' ? 'Search packages (e.g. Compact, Jolli)' : 'Search'} aria-label="Search" />}
      <div className="pkg-list" role="radiogroup">
        {shown.map((v) => {
          const p = priceOf(v.variation_amount);
          const on = v.variation_code === value;
          const per = period(v.name) || (kind === 'cable' ? 'Monthly' : null);
          return (
            <button key={v.variation_code} type="button" role="radio" aria-checked={on} className={`pkg-card${on ? ' on' : ''}`} onClick={() => onChange(v.variation_code)} title={v.name}>
              <span className={`pkg-radio${on ? ' on' : ''}`} aria-hidden />
              <span className="pkg-main">
                <span className="pkg-name">{tidy(v.name)}</span>
                {per && <span className="pkg-sub">{per}</span>}
              </span>
              <span className="pkg-price">
                {naira(p.total)}
                {p.total < p.base && <s>{naira(p.base)}</s>}
                {p.total > p.base && <small>incl. ₦{Math.round(p.total - p.base).toLocaleString()} service charge</small>}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No match.</p>}
      </div>
    </div>
  );
}

// Quick amounts for light / bet funding, with what you pay.
export function QuickAmounts({ amounts, value, onPick, priceOf }) {
  return (
    <div className="plan-grid" style={{ marginBottom: 10 }}>
      {amounts.map((a) => {
        const p = priceOf(a);
        const on = Number(value) === a;
        return (
          <button key={a} type="button" className={`plan-card${on ? ' on' : ''}`} style={{ minHeight: 70 }} onClick={() => onPick(String(a))} aria-pressed={on}>
            <div className="plan-size" style={{ fontSize: 17 }}>{naira(a)}</div>
            <div className="plan-valid">{p.total !== a ? `Pay ${naira(p.total)}` : ' '}</div>
          </button>
        );
      })}
    </div>
  );
}
