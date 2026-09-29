import { useEffect, useState } from 'react';
import { getInsights } from '../api';

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString()}`;
const LABEL = { AIRTIME: 'Airtime', DATA: 'Data', ELECTRICITY: 'Electricity', CABLE: 'Cable TV', EDUCATION: 'Exam PINs', INTERNET: 'Internet', BETTING: 'Betting', OTHER: 'Other', BANK_TRANSFER: 'Sent to banks', SENT_TO_FRIENDS: 'Sent to friends' };
const MONTH = (k) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('en-NG', { month: 'short' });

// Wallet page: "You spent ₦12,400 this month, mostly on data" with the
// last 6 months as bars (one series, so no legend — the title names it).
export default function SpendingCard() {
  const [data, setData] = useState(null);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    getInsights().then(setData).catch(() => setData(null));
  }, []);
  if (!data || !data.months.some((m) => m.total > 0)) return null;

  const { current, previous, top } = data;
  const max = Math.max(...data.months.map((m) => m.total), 1);
  const change = previous?.total > 0 ? Math.round(((current.total - previous.total) / previous.total) * 100) : null;
  const shown = hover ? data.months.find((m) => m.month === hover) : current;

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15 }}>📊 Your spending</div>
      <p style={{ margin: '6px 0 12px', fontSize: 14 }}>
        {current.total > 0 ? (
          <>You spent <b>{naira(current.total)}</b> this month{top ? <>, mostly on <b>{(LABEL[top.category] || top.category).toLowerCase()}</b></> : ''}.
            {change !== null && <span style={{ color: 'var(--slate-400)' }}> {change === 0 ? 'Same as' : `${Math.abs(change)}% ${change > 0 ? 'more than' : 'less than'}`} last month.</span>}</>
        ) : <>No spending yet this month. Last month: <b>{naira(previous?.total)}</b>.</>}
      </p>

      <div role="img" aria-label={`Monthly spending: ${data.months.map((m) => `${MONTH(m.month)} ${naira(m.total)}`).join(', ')}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, borderBottom: '1px solid var(--slate-700)', paddingBottom: 0 }}>
        {data.months.map((m) => {
          const h = m.total > 0 ? Math.max(4, Math.round((m.total / max) * 100)) : 0;
          const isCurrent = m.month === current.month;
          return (
            <button
              key={m.month}
              type="button"
              onMouseEnter={() => setHover(m.month)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.month)}
              onBlur={() => setHover(null)}
              onClick={() => setHover((x) => (x === m.month ? null : m.month))}
              title={`${MONTH(m.month)}: ${naira(m.total)}`}
              aria-label={`${MONTH(m.month)}: ${naira(m.total)}`}
              style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span style={{ display: 'block', width: '100%', maxWidth: 28, margin: '0 auto', height: `${h}%`, background: 'var(--purple)', opacity: hover && hover !== m.month ? 0.45 : isCurrent || hover === m.month ? 1 : 0.7, borderRadius: '4px 4px 0 0' }} />
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {data.months.map((m) => (
          <span key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: m.month === (hover || current.month) ? 'var(--slate-100)' : 'var(--slate-400)', fontWeight: m.month === (hover || current.month) ? 700 : 400 }}>{MONTH(m.month)}</span>
        ))}
      </div>

      {shown?.categories?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 6 }}>{hover ? `${MONTH(hover)}: ${naira(shown.total)}` : 'This month by type'}</div>
          {shown.categories.slice(0, 5).map((c) => (
            <div key={c.category} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
              <span>{LABEL[c.category] || c.category}</span>
              <span style={{ height: 6, background: 'var(--slate-700)', borderRadius: 4, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.round((c.amount / shown.total) * 100))}%`, background: 'var(--purple)', borderRadius: 4 }} />
              </span>
              <span style={{ fontWeight: 600 }}>{naira(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
