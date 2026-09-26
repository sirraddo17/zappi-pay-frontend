import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContest } from '../api';
import { useAuth } from '../context/AuthContext';
import { shareWinnerCard } from '../lib/winnerCard';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const ORD = ['1st', '2nd', '3rd'];

function countdown(to) {
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function fmt(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Referral contest: prizes, rules, your progress, leaderboard, and a
// "Share my win" picture for winners. `compact` = home-screen banner.
export default function ContestCard({ compact = false }) {
  const { customer } = useAuth();
  const [data, setData] = useState(null);
  const [, tick] = useState(0);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    getContest().then(setData).catch(() => setData({ contest: null }));
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const c = data?.contest;
  if (!c) return null;
  const total = c.prizes.reduce((s, p) => s + p, 0);
  const code = customer?.username;
  const link = code ? `${window.location.origin}/signup?ref=${code}` : `${window.location.origin}/`;

  if (compact) {
    if (c.phase !== 'LIVE' && c.phase !== 'UPCOMING' && !data.won) return null;
    return (
      <Link to="/refer" className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: '#fff', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', marginTop: 16 }}>
        <span style={{ fontSize: 26 }}>🏆</span>
        <span style={{ flex: 1 }}>
          <b style={{ display: 'block', fontSize: 14 }}>{data.won ? `You won ${naira(data.won.prize)}!` : c.title}</b>
          <span style={{ fontSize: 13, opacity: 0.95 }}>
            {data.won ? 'Tap to share your win' : c.phase === 'UPCOMING' ? `Starts ${fmt(c.startsAt)} · ${naira(total)} in prizes` : `${naira(total)} in prizes · ${countdown(c.endsAt)}${data.me?.qualified ? ` · you: ${data.me.qualified}` : ''}`}
          </span>
        </span>
        <span>›</span>
      </Link>
    );
  }

  async function shareWin() {
    setSharing(true);
    try {
      await shareWinnerCard({ contestTitle: c.title, rank: data.won.rank, prize: data.won.prize, friends: data.won.qualified, code, link });
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="card" style={{ border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, letterSpacing: 0.5 }}>🏆 REFERRAL CONTEST</div>
          <b style={{ fontSize: 17 }}>{c.title}</b>
        </div>
        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: c.phase === 'LIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: c.phase === 'LIVE' ? 'var(--green-500)' : 'var(--slate-400)', whiteSpace: 'nowrap' }}>
          {c.phase === 'LIVE' ? countdown(c.endsAt) : c.phase === 'UPCOMING' ? `Starts ${fmt(c.startsAt)}` : 'Ended'}
        </span>
      </div>
      {c.description && <p style={{ fontSize: 14, margin: '8px 0 0' }}>{c.description}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {c.prizes.map((p, i) => (
          <div key={i} style={{ flex: '1 1 90px', background: 'var(--slate-900)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{ORD[i] || `${i + 1}th`} place</div>
            <div style={{ fontWeight: 800, color: '#f59e0b' }}>{naira(p)}</div>
          </div>
        ))}
      </div>

      {data.won && (
        <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid var(--green-500)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <b>🎉 You came {ORD[data.won.rank - 1] || `${data.won.rank}th`} and won {naira(data.won.prize)}!</b>
          <div style={{ fontSize: 13, color: 'var(--slate-300, #cbd5e1)', marginTop: 4 }}>
            {data.won.paid ? 'The prize is in your wallet.' : 'Your prize will be added to your wallet shortly.'}
          </div>
          <button type="button" className="btn" style={{ width: 'auto', marginTop: 10 }} disabled={sharing} onClick={shareWin}>
            {sharing ? 'Preparing…' : 'Share my win 📸'}
          </button>
        </div>
      )}

      {data.me && c.phase === 'LIVE' && (
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', background: 'var(--slate-900)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>{data.me.qualified}</div><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Counted</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>{data.me.pending}</div><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{c.requireVerified ? 'Waiting (verify + buy)' : 'Waiting for 1st purchase'}</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>{data.me.rank ? `#${data.me.rank}` : '—'}</div><div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Your rank</div></div>
        </div>
      )}

      {data.leaderboard?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{c.phase === 'LIVE' ? 'Leaderboard' : 'Final results'}</div>
          {data.leaderboard.map((r) => (
            <div key={r.rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--slate-700)', fontWeight: r.you ? 700 : 400, color: r.you ? '#f59e0b' : 'inherit' }}>
              <span>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}.`} {r.name}{r.you ? ' (you)' : ''}</span>
              <span>{r.qualified} friend{r.qualified === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>How it works</summary>
        <ul style={{ fontSize: 13, color: 'var(--slate-300, #cbd5e1)', paddingLeft: 18, margin: '8px 0 0', lineHeight: 1.5 }}>
          <li>Runs from {fmt(c.startsAt)} to {fmt(c.endsAt)}.</li>
          <li>Only friends who <b>sign up with your code during the contest</b> count.</li>
          <li>A friend counts only after they <b>buy something or send money to a bank</b> in the app{c.minQualifyingAmount > 0 ? ` (at least ${naira(c.minQualifyingAmount)})` : ''}{c.requireVerified ? <> and <b>verify their BVN or NIN</b> (by getting their personal account number on the Wallet page)</> : ''} before the contest ends.</li>
          {c.requireVerified && <li>One BVN/NIN can only be used on one ZAPPI PAY account, so every friend must be a real, different person.</li>}
          <li>The top {c.prizes.length} win{c.minReferrals > 1 ? `, with at least ${c.minReferrals} counted friends` : ''}. A tie goes to whoever reached it first.</li>
          <li>Prizes go straight into the winners' ZAPPI PAY wallets.</li>
          <li>Fake or duplicate accounts are removed from the contest.</li>
        </ul>
      </details>
    </div>
  );
}
