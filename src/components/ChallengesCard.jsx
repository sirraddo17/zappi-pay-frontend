import { useEffect, useState } from 'react';
import { getChallenges } from '../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const SERVICE = { AIRTIME: 'airtime', DATA: 'data', ELECTRICITY: 'electricity', CABLE: 'TV', EDUCATION: 'exam PIN', INTERNET: 'internet', BETTING: 'betting' };

function goalText(c) {
  const what = c.service ? SERVICE[c.service] || c.service.toLowerCase() : 'anything';
  const min = c.minAmount > 0 ? ` (${naira(c.minAmount)} or more each)` : '';
  if (c.kind === 'COUNT') return `Buy ${what} ${c.target} time${c.target === 1 ? '' : 's'}${min}`;
  if (c.kind === 'SPEND') return `Spend ${naira(c.target)} on ${what}${min}`;
  return `Buy ${what} ${c.target} days in a row${min}`;
}

function progressText(c) {
  if (c.kind === 'SPEND') return `${naira(c.current)} of ${naira(c.target)}`;
  if (c.kind === 'STREAK') return `${c.current} of ${c.target} days`;
  return `${c.current} of ${c.target}`;
}

function endsText(c) {
  if (!c.endsAt) return '';
  const days = Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / 86400000);
  if (days <= 1) return 'ends today';
  return `${days} days left`;
}

// Home page: running challenges with progress. Hidden when there are none.
export default function ChallengesCard() {
  const [list, setList] = useState([]);
  const [all, setAll] = useState(false);
  useEffect(() => {
    getChallenges().then((d) => setList(d.challenges || [])).catch(() => setList([]));
  }, []);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, 2);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>🎯 Challenges</div>
      <div style={{ display: 'grid', gap: 12 }}>
        {shown.map((c) => {
          const pct = Math.min(100, Math.round((c.current / c.target) * 100));
          return (
            <div key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <b style={{ fontSize: 14 }}>{c.title}</b>
                <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.completed ? `✅ ${naira(c.paid)}` : `Get ${naira(c.reward)}`}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{c.description || goalText(c)}</div>
              <div style={{ height: 8, background: 'var(--slate-700)', borderRadius: 6, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${c.completed ? 100 : pct}%`, height: '100%', background: c.completed ? 'var(--green-500)' : 'var(--purple)', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-400)', marginTop: 3 }}>
                <span>{c.completed ? 'Done — reward added to your wallet' : progressText(c)}</span>
                <span>{c.period === 'WEEKLY' ? 'This week' : c.period === 'MONTHLY' ? 'This month' : ''}{endsText(c) ? ` · ${endsText(c)}` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > 2 && (
        <button type="button" onClick={() => setAll((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--purple)', padding: 0, marginTop: 10, cursor: 'pointer', fontSize: 13 }}>
          {all ? 'Show less' : `Show ${list.length - 2} more`}
        </button>
      )}
    </div>
  );
}
