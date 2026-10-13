import { Link } from 'react-router-dom';
import { NETWORK_STYLE } from '../lib/network';

// Shared pieces for the More services (bulk, print cards, exam PINs,
// airtime to cash, deals, insurance, international) so they all look
// like the main Buy screens.

export const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Page top: back link, coloured icon tile, title, one line, and an
// optional "how it works" strip of 2–3 short steps.
export function SvcHero({ back = '/more', backLabel = 'Back', icon, color = '#0D9488', title, sub, steps }) {
  return (
    <div className="svc-hero">
      <Link to={back} className="svc-back">← {backLabel}</Link>
      <div className="svc-head">
        <span className="svc-ico" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }} aria-hidden>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {steps?.length > 0 && (
        <ol className="svc-steps">
          {steps.map((s, i) => <li key={s}><b>{i + 1}</b><span>{s}</span></li>)}
        </ol>
      )}
    </div>
  );
}

// A labelled block inside a form card.
export function Step({ n, title, children, right }) {
  return (
    <div className="svc-step">
      <div className="svc-step-h">
        {n != null && <span className="svc-n">{n}</span>}
        <span>{title}</span>
        {right && <span className="svc-step-r">{right}</span>}
      </div>
      {children}
    </div>
  );
}

// Network chips with brand colours. items: [{ key, label, net? }] where
// net is mtn/airtel/glo/etisalat (for colours).
export function NetChips({ items, value, onChange, label = 'Network' }) {
  return (
    <div className="prov-chips" role="radiogroup" aria-label={label}>
      {items.map((x) => {
        const st = NETWORK_STYLE[x.net] || { bg: x.bg || 'var(--slate-700)', fg: x.fg || '#fff', name: x.label };
        const on = value === x.key;
        return (
          <button key={x.key} type="button" role="radio" aria-checked={on} className={`prov-chip${on ? ' on' : ''}`} onClick={() => onChange(x.key)}>
            <span className="prov-badge" style={{ background: st.bg, color: st.fg }}>{(st.name || x.label).slice(0, 4)}</span>
            {x.label}
          </button>
        );
      })}
    </div>
  );
}

// − [ 10 ] + with quick picks underneath.
export function Stepper({ value, onChange, min = 1, max = 50, quick = [], unit = '' }) {
  const n = parseInt(value, 10) || 0;
  const set = (v) => onChange(String(Math.max(min, Math.min(max, v))));
  return (
    <div>
      <div className="stepper">
        <button type="button" onClick={() => set(n - 1)} disabled={n <= min} aria-label="Fewer">−</button>
        <input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} aria-label="How many" />
        <button type="button" onClick={() => set(n + 1)} disabled={n >= max} aria-label="More">+</button>
      </div>
      {quick.length > 0 && (
        <div className="qty-chips">
          {quick.filter((q) => q <= max).map((q) => (
            <button key={q} type="button" className={`qty-chip${n === q ? ' on' : ''}`} onClick={() => set(q)}>{q}{unit && ` ${unit}`}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// The dashed receipt-style summary used on the PIN sheet, inline.
export function Summary({ rows, total, totalLabel = 'You pay', note }) {
  return (
    <div className="confirm-sum svc-sum">
      {rows.filter(Boolean).map(([k, v, tone]) => (
        <div key={k} className="confirm-row"><span>{k}</span><b style={tone === 'good' ? { color: 'var(--green-500)' } : tone === 'bad' ? { color: 'var(--red-500)' } : undefined}>{v}</b></div>
      ))}
      {total != null && <div className="confirm-total"><span>{totalLabel}</span><b>{total}</b></div>}
      {note && <div className="confirm-note">{note}</div>}
    </div>
  );
}

// Small trust line under a pay button.
export function Trust({ children }) {
  return <p className="svc-trust"><span aria-hidden>🔒</span> {children}</p>;
}

// Shown on every money-sending PIN sheet (to users or banks).
export function NoReverseNote({ bank }) {
  return (
    <div className="noreverse" role="alert">
      <b>⚠️ Check before you confirm</b>
      <span>A successful transfer can’t be reversed. Make sure the {bank ? 'account name, bank and' : 'name and'} amount are correct — only send to people you know and trust.</span>
    </div>
  );
}
