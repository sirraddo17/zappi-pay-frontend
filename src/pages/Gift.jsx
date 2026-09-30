import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { getGift } from '../api';
import { GIFT_THEMES } from '../lib/giftThemes';

// Public gift card: /gift/:token — opened by the person who received
// the airtime or data. No login needed.
export default function Gift() {
  const { token } = useParams();
  const [g, setG] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = 'You got a gift · ZAPPI PAY';
    getGift(token).then(setG).catch((e) => setErr(e.message || 'This gift link is not available.'));
    return () => { document.title = 'ZAPPI PAY'; };
  }, [token]);

  const t = GIFT_THEMES[g?.theme] || GIFT_THEMES.JUST_BECAUSE;
  const what = g ? `₦${Number(g.value).toLocaleString()}${g.network ? ` ${g.network}` : ''} ${g.kind}` : '';
  const signup = g?.ref ? `/signup?ref=${encodeURIComponent(g.ref)}` : '/signup';

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <div style={{ padding: '20px 16px 8px' }}>
        <Link to="/welcome" style={{ textDecoration: 'none' }} aria-label="ZAPPI PAY home"><Logo iconSize={32} wordmarkSize={18} /></Link>
      </div>
      {!g && !err && <p className="empty-state">Opening your gift…</p>}
      {err && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>🎁</div>
          <p style={{ margin: '8px 0 0' }}>{err}</p>
        </div>
      )}
      {g && (
        <>
          <div className="card gift-pop" style={{ background: t.bg, border: 'none', color: '#fff', textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">{t.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{t.title}</div>
            <div style={{ fontSize: 15, marginTop: 6, opacity: 0.95 }}><b>{g.fromName}</b> sent you</div>
            <div style={{ fontSize: 30, fontWeight: 800, margin: '4px 0' }}>{what}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>to your line {g.to}</div>
            {g.message && (
              <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.16)', fontSize: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                “{g.message}”
              </div>
            )}
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{g.delivered ? '✓ Already on your line' : '⏳ On its way to your line'}</div>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '6px 0 0' }}>
              {g.kind === 'airtime' ? 'Check your balance to see it.' : 'Check your data balance to see it.'} No need to do anything else.
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Send one back 😉</div>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 12px' }}>
              Buy airtime, data, electricity and TV in seconds with ZAPPI PAY — and send gifts like this one.
            </p>
            <Link to={signup} className="btn" style={{ display: 'block', textDecoration: 'none' }}>Create free account</Link>
          </div>
        </>
      )}
      <style>{`@media (prefers-reduced-motion: no-preference){.gift-pop{animation:giftpop .5s ease-out}@keyframes giftpop{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}}`}</style>
    </div>
  );
}
