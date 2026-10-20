import { useMemo, useState } from 'react';

// Data plans as tappable cards grouped into tabs (Daily / Weekly /
// Monthly …), like the big wallet apps. Groups come from the plan name
// VTpass sends ("MTN N1000 1.5GB - 30 days"), so new plans sort
// themselves; anything we can't read lands in "Others".

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString()}`;

function size(name) {
  const n = String(name || '');
  // VTpass typo "3GB 5GB - 2,475 Naira": two sizes side by side — the second is the plan.
  const two = /(\d+(?:\.\d+)?)\s*(TB|GB|MB)\s+(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/i.exec(n);
  if (two) return { value: two[3], unit: two[4].toUpperCase() };
  const m = /(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/i.exec(n);
  if (m) return { value: m[1], unit: m[2].toUpperCase() };
  const g = /(\d+(?:\.\d+)?)\s*G(?=\s*[-–(]|\s*$)/.exec(n); // "T2 6.2G - 3,000 Naira"
  return g ? { value: g[1], unit: 'GB' } : null;
}

// Plans that last only hours. An owner correction (v.zpHours, from
// Admin → Orders → "Plan details wrong?") wins over the VTpass name,
// which is sometimes wrong (e.g. "1 Day" for a 2-hour plan).
export function hoursOf(name, v) {
  if (v?.zpHours) return Number(v.zpHours);
  const n = String(name || '').toLowerCase();
  const m = /(\d+)\s*-?\s*(?:hrs?|hours?)\b/.exec(n);
  if (!m || /\d+\s*-?\s*(?:days?|dys?|weeks?|wks?|months?|mnths?)\b|\b(daily|weekly|monthly)\b/.test(n)) return null;
  return Number(m[1]);
}
const isShort = (name, v) => { const h = hoursOf(name, v); return h != null && h < 24; };

// Validity in days (null when the name doesn't say).
export function validityDays(name, v) {
  if (v?.zpHours) return v.zpHours < 24 ? 0 : Math.round(v.zpHours / 24);
  // "+ 2GB daily" is a per-day allowance, not a 1-day plan.
  const n = String(name || '').toLowerCase().replace(/\+\s*\d+(?:\.\d+)?\s*(?:gb|mb)\s+(?:daily|per\s+day)/g, ' ');
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

// Conditions a plan carries, read from the name VTpass sends. Shown on
// every card (not only after picking) so nobody buys a weekend or night
// plan by mistake. Order matters: the first one is the plan's group.
const CONDITIONS = [
  { key: 'Weekend', icon: '📅', re: /week\s*-?\s*end|\bsat(urday)?\b|\bsun(day)?\b/, note: 'Works only on Saturday and Sunday' },
  { key: 'Night', icon: '🌙', re: /night|midnight|\b(12|1|2)\s*(am|a\.m)\s*(-|–|to)/, note: 'Works only at night' },
  { key: 'Social', icon: '💬', re: /social|whatsapp|youtube|tiktok|instagram|facebook|\bfb\b|twitter|\bx\s*only\b|glo\s*tv|\bvod\b|myg\b|\byt\b/, note: 'Only for the apps named in the plan' },
  { key: 'Broadband', icon: '📶', re: /router|broadband|\bmifi\b|unlimited/, note: 'For routers / MiFi' },
  { key: 'Calls', icon: '📞', re: /smilevoice|voice\s*only/, note: 'Call minutes only — no data' },
];
const NOTE = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.note]));

// Bundles read "main allowance + bonus": "N800 1GB + 1GB YouTube Night +
// 100MB YouTube Music – Weekly" is 1GB of everyday data with night/YouTube
// extras. Each "+ …" bonus runs until the next " - ", "(" or ","; what
// follows (validity, "5G Router Data", "Night plan") is about the whole
// plan again. Only the main part decides the plan's conditions.
export function splitPlan(name) {
  const segs = String(name || '').toLowerCase().split('+');
  let main = segs[0];
  let bonus = '';
  for (const seg of segs.slice(1)) {
    const cut = seg.search(/\s[-–]|\(|,/);
    if (cut < 0) bonus += ` ${seg}`;
    else { bonus += ` ${seg.slice(0, cut)}`; main += ` ${seg.slice(cut)}`; }
  }
  return { main, bonus };
}
function mainPart(name) {
  return splitPlan(name).main;
}

// Every condition on a plan, e.g. ['Weekend'] or ['Night', 'Social'].
export function planConditions(name) {
  const n = mainPart(name);
  return CONDITIONS.filter((c) => c.re.test(n)).map((c) => c.key);
}
// Extras that come on top of the main data, e.g. ['Night', 'Social'].
export function planBonuses(name) {
  const { bonus } = splitPlan(name);
  if (!bonus.trim()) return [];
  const main = planConditions(name);
  return CONDITIONS.filter((c) => c.key !== 'Broadband' && c.key !== 'Calls' && !main.includes(c.key) && c.re.test(bonus)).map((c) => c.key);
}
// Plain warning for the confirm sheet, or null for an everyday plan.
export function planWarning(name, v) {
  const c = planConditions(name).filter((k) => k !== 'Broadband');
  const h = hoursOf(name, v);
  const extra = [h != null && h < 24 ? `Lasts only ${h} hour${h === 1 ? '' : 's'} from when you buy it` : null, v?.zpNote || null].filter(Boolean);
  if (!c.length) return extra.length ? extra.join(' · ') : null;
  const n0 = mainPart(name);
  const time = /(\d{1,2}\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}\s*(?:am|pm))/i.exec(String(name || ''));
  const n = n0;
  const sat = /\bsat(urday)?\b/.test(n);
  const sun = /\bsun(day)?\b/.test(n);
  const only = sun && !sat && !/week\s*-?\s*end/.test(n) ? 'Sunday' : sat && !sun && !/week\s*-?\s*end/.test(n) ? 'Saturday' : null;
  const parts = c.map((k) => (k === 'Night' && time ? `Works only at night (${time[1].replace(/\s+/g, '')})` : k === 'Weekend' && only ? `Works only on ${only}` : NOTE[k]));
  let text = [...parts, ...extra].join(' · ');
  if (c.includes('Weekend')) {
    const day = new Date().getDay(); // 0 Sun … 6 Sat
    const works = only === 'Sunday' ? day === 0 : only === 'Saturday' ? day === 6 : day === 0 || day === 6;
    if (!works) text += `. Today is ${new Date().toLocaleDateString('en-NG', { weekday: 'long' })} — it won’t work today`;
  }
  return text;
}
function special(name) {
  return planConditions(name)[0] || null;
}
const ICON = Object.fromEntries(CONDITIONS.map((c) => [c.key, c.icon]));

export function groupOf(name, v) {
  const sp = special(name);
  if (sp) return sp;
  if (isShort(name, v)) return 'Hourly';
  const d = validityDays(name, v);
  if (d == null) return 'Others';
  if (d <= 2) return 'Daily';
  if (d <= 14) return 'Weekly';
  if (d <= 31) return 'Monthly';
  return '2 Months+';
}

const ORDER = ['Hourly', 'Daily', 'Weekly', 'Monthly', '2 Months+', 'Weekend', 'Night', 'Social', 'Broadband', 'Calls', 'Others'];

function validityLabel(name, v) {
  const h = hoursOf(name, v);
  if (h != null && h < 24) return `${h} Hour${h === 1 ? '' : 's'}`;
  if (v?.zpHours) { const dd = Math.round(v.zpHours / 24); return dd === 1 ? '1 Day' : `${dd} Days`; }
  const n = String(name || '').toLowerCase();
  const hrs = /(\d+)\s*-?\s*(?:hrs?|hours?)\b/.exec(n);
  if (hrs && !/(\d+)\s*-?\s*(?:days?|dys?|weeks?|wks?|months?|mnths?)\b|daily|weekly|monthly/.test(n)) return `${hrs[1]} Hour${hrs[1] === '1' ? '' : 's'}`;
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
      const g = groupOf(v.name, v);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(v);
    }
    for (const list of map.values()) list.sort((a, b) => Number(a.variation_amount) - Number(b.variation_amount));
    return ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, plans: map.get(g) }));
  }, [variations]);
  const hot = useMemo(() => {
    const priced = variations.filter((v) => Number(v.variation_amount) >= 200 && Number(v.variation_amount) <= 5000 && perGb(v) < Infinity && !planConditions(v.name).length && !isShort(v.name, v));
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
      {(() => {
        // Value bars: the cheapest ₦ per GB in this list fills the bar;
        // dearer plans fill less. Tags: Best deal, Night, Social.
        const per = (v) => { const g = perGb(v); return g === Infinity ? null : g; };
        // Bars compare against the cheapest everyday plan (≤ ₦10,000), so a
        // ₦200k yearly bundle doesn't make every normal plan look bad.
        const everyday = shown.filter((v) => Number(v.variation_amount) <= 10000 && !planConditions(v.name).length && !isShort(v.name, v));
        const vals = (everyday.length > 1 ? everyday : shown).map(per).filter((x) => x != null);
        const best = vals.length > 1 ? Math.min(...vals) : null;
        return (
          <div className="vplan-list" role="radiogroup" aria-label="Data plans">
            {shown.map((v) => {
              const s = size(v.name);
              const p = priceOf(v.variation_amount);
              const on = v.variation_code === value;
              const g = per(v);
              const conds = planConditions(v.name);
              const short = isShort(v.name, v) ? hoursOf(v.name, v) : null;
              const bonus = planBonuses(v.name);
              const isBest = !conds.length && short == null && best != null && g != null && g <= best + 0.01 && (everyday.length <= 1 || Number(v.variation_amount) <= 10000);
              const save = Math.round(p.base - p.total);
              return (
                <button key={v.variation_code} type="button" role="radio" aria-checked={on} className={`vplan${on ? ' on' : ''}${isBest ? ' best' : ''}`} onClick={() => onChange(v.variation_code)} title={v.name}>
                  <div className="vplan-top">
                    <div style={{ minWidth: 0 }}>
                      {s ? <span className="vplan-gb">{s.value}<small>{s.unit}</small></span> : <span className="vplan-gb" style={{ fontSize: 15 }}>{v.name.replace(/^\w+\s+(data\s+)?/i, '').slice(0, 30)}</span>}
                      <span className="vplan-valid">{validityLabel(v.name, v) || ''}</span>
                    </div>
                    <div className="vplan-price">{on && '✓ '}{naira(p.total)}{p.total < p.base && <s>{naira(p.base)}</s>}</div>
                  </div>
                  <div className="vplan-meta">
                    {g != null ? <>{naira(p.total / (v.variation_amount / g))} per GB</> : ' '}
                    {conds.map((c) => <span key={c}> · <b className={`vplan-cond${c === 'Weekend' || c === 'Night' ? ' warn' : ''}`}>{ICON[c]} {c === 'Weekend' ? 'Weekend only' : c === 'Night' ? 'Night only' : c === 'Calls' ? 'Calls only' : c}</b></span>)}
                    {short != null && <> · <b className="vplan-cond warn">⏱ {short} hour{short === 1 ? '' : 's'} only</b></>}
                    {bonus.length > 0 && <> · <b className="vplan-cond">🎁 + {bonus.map((c) => (c === 'Night' ? 'night' : c === 'Social' ? 'app' : c.toLowerCase())).join(' & ')} bonus</b></>}
                    {isBest && <> · <b>🏆 Best deal</b></>}
                    {save >= 5 && <> · save {naira(save)}</>}
                  </div>
                  <div className="vplan-name">{v.name}</div>
                  {v.zpNote && <div className="vplan-name" style={{ color: 'var(--gold, #FFB830)' }}>ℹ️ {v.zpNote}</div>}
                  {g != null && best != null && <div className="vplan-bar" aria-hidden><i style={{ width: `${Math.min(100, Math.max(8, Math.round((best / g) * 100)))}%` }} /></div>}
                </button>
              );
            })}
            {shown.length === 0 && <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No plans match.</p>}
          </div>
        );
      })()}
      {!all && !q.trim() && list.length > LIMIT && (
        <button type="button" className="plan-more" onClick={() => setAll(true)}>Show all {list.length} plans ▾</button>
      )}
      {picked && (
        <div className="plan-picked" role="status">
          <div style={{ minWidth: 0 }}>
            <b>{(() => { const z = size(picked.name); return z ? `${z.value}${z.unit}` : 'Plan'; })()}</b>
            {validityLabel(picked.name, picked) && <span> · {validityLabel(picked.name, picked)}</span>}
            <div className="plan-picked-name">{picked.name}</div>
            {planWarning(picked.name, picked) && <div className="plan-picked-warn">⚠️ {planWarning(picked.name, picked)}</div>}
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
