import { useEffect, useState } from 'react';
import { getReferralTicker } from '../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

function left(until) {
  const ms = new Date(until).getTime() - Date.now();
  if (!(ms > 0)) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

// "This week only: ₦150 per friend" with a live countdown.
export function BoostBanner({ until, bonus, normalBonus }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const t = until ? left(until) : null;
  if (!t) return null;
  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #ff8a00, #ff3d77)', border: 'none', color: '#fff' }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>🔥 Boost: {naira(bonus)} per friend{normalBonus && normalBonus < bonus ? <span style={{ fontWeight: 400, opacity: 0.85 }}> (usually {naira(normalBonus)})</span> : null}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Ends in <b style={{ fontVariantNumeric: 'tabular-nums' }}>{t}</b>. Friends who reach the target before then earn you the boosted bonus.</div>
    </div>
  );
}

// 1 friend → bonus, 3 friends → +extra, 5 friends → +extra.
export function MilestoneLadder({ milestones, rewarded, bonus }) {
  if (!milestones?.length) return null;
  const steps = [{ count: 1, bonus, base: true }, ...milestones];
  const max = steps[steps.length - 1].count;
  const pct = Math.min(100, (rewarded / max) * 100);
  const next = steps.find((s) => rewarded < s.count);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0, fontSize: 16 }}>🏆 Milestone bonuses</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--slate-400)' }}>
        {next ? <>Get <b style={{ color: 'var(--gold)' }}>{naira(next.bonus)}</b> {next.base ? 'for your first friend' : 'extra'} when {next.count} friend{next.count > 1 ? 's' : ''} reach the target — you're at {rewarded}.</> : <>You've unlocked every milestone 🎉 Keep inviting — every friend still earns you {naira(bonus)}.</>}
      </p>
      <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'var(--slate-700, #334155)', margin: '18px 6px 34px' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, borderRadius: 99, background: 'var(--gold, #ffb830)' }} />
        {steps.map((s) => {
          const done = rewarded >= s.count;
          return (
            <div key={s.count} style={{ position: 'absolute', left: `${(s.count / max) * 100}%`, top: -14, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 12, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: done ? 'var(--green-500, #22c55e)' : 'var(--slate-800, #1e293b)', color: done ? '#fff' : 'var(--gold, #ffb830)', border: '1px solid var(--slate-600, #475569)' }}>{s.base ? '' : '+'}{naira(s.bonus)}</div>
              <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 16 }}>{s.count} friend{s.count > 1 ? 's' : ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Real recent payouts, names masked.
export function LiveTicker() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  useEffect(() => {
    getReferralTicker().then((d) => setItems(d.items || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (items.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 3500);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const it = items[i % items.length];
  const ago = Math.max(1, Math.round((Date.now() - new Date(it.at).getTime()) / 60000));
  const when = ago < 60 ? `${ago} min ago` : ago < 1440 ? `${Math.round(ago / 60)} h ago` : `${Math.round(ago / 1440)} d ago`;
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
      <span aria-hidden>🔊</span>
      <div style={{ flex: 1, fontSize: 13 }} aria-live="polite">
        <b>{it.name}</b> earned <b style={{ color: 'var(--gold)' }}>{naira(it.amount)}</b> {it.milestone ? 'milestone bonus' : 'for inviting a friend'} · <span style={{ color: 'var(--slate-400)' }}>{when}</span>
      </div>
      <span style={{ fontSize: 10, color: 'var(--slate-400)', whiteSpace: 'nowrap' }}>Real payouts</span>
    </div>
  );
}

// WhatsApp nudge for a friend who joined but hasn't reached the target.
export function remindLink({ friend, progress, link, target }) {
  const first = String(friend || '').split(' ')[0];
  const where = progress != null ? `You're ${progress}% of the way` : 'You joined';
  const text = `Hi ${first}! ${where} on ZAPPI PAY 🎉 Buy your airtime, data, TV or light there${target ? ` — once you've spent ₦${Number(target).toLocaleString()} in total` : ''}, it helps me earn my invite bonus. Thank you! ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
