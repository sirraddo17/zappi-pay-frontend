import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { getShop } from '../api';
import { useAuth } from '../context/AuthContext';
import { rememberShop } from '../lib/shopRef';

const ITEMS = [
  ['airtime', '📱', 'Airtime'],
  ['data', '📶', 'Data'],
  ['electricity', '⚡', 'Electricity'],
  ['cable', '📺', 'Cable TV'],
  ['education', '🎓', 'Exam PINs'],
  ['betting', '🏆', 'Bet funding'],
];

// Public agent shop: zappipay.com.ng/shop/<username>.
export default function Shop() {
  const { username } = useParams();
  const { customer } = useAuth();
  const [shop, setShop] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getShop(username).then((s) => {
      setShop(s);
      rememberShop(s.username, s.name);
      document.title = `${s.name} · ZAPPI PAY`;
    }).catch((e) => setErr(e.message || 'This shop is not available.'));
    return () => { document.title = 'ZAPPI PAY'; };
  }, [username]);

  const go = (slug) => (customer ? `/buy/${slug}` : `/signup?ref=${encodeURIComponent(shop?.username || '')}`);

  return (
    <div className="app-shell" style={{ paddingBottom: 32 }}>
      <div style={{ padding: '20px 16px 8px' }}>
        <Link to="/welcome" style={{ textDecoration: 'none' }} aria-label="ZAPPI PAY home"><Logo iconSize={32} wordmarkSize={18} /></Link>
      </div>
      {!shop && !err && <p className="empty-state">Opening shop…</p>}
      {err && <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 36 }}>🏪</div><p>{err}</p></div>}
      {shop && (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg, #863bff, #5b1fc4)', border: 'none', color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>🏪 ZAPPI PAY agent</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{shop.name}</div>
            {shop.tagline && <div style={{ fontSize: 14, marginTop: 4 }}>{shop.tagline}</div>}
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>Run by {shop.owner} · @{shop.username}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px' }}>
            {ITEMS.map(([slug, icon, label]) => (
              <Link key={slug} to={go(slug)} className="card" style={{ margin: 0, textAlign: 'center', textDecoration: 'none', color: 'var(--slate-100)', padding: '14px 6px' }}>
                <div style={{ fontSize: 24 }} aria-hidden="true">{icon}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{label}</div>
              </Link>
            ))}
          </div>
          <div className="card" style={{ textAlign: 'center', marginTop: 16 }}>
            {customer ? (
              <p style={{ fontSize: 14, margin: 0 }}>✓ Your purchases now support <b>{shop.name}</b>. You pay the normal price.</p>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Buy in seconds, any time</div>
                <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 12px' }}>Create a free ZAPPI PAY account, fund your wallet by bank transfer and buy airtime, data, light and TV — you support {shop.name} every time.</p>
                <Link to={`/signup?ref=${encodeURIComponent(shop.username)}`} className="btn" style={{ display: 'block', textDecoration: 'none' }}>Create free account</Link>
                <Link to="/login" style={{ display: 'block', marginTop: 10, fontSize: 13, color: 'var(--purple)' }}>I already have an account</Link>
              </>
            )}
          </div>
          {shop.whatsapp && (
            <a href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noreferrer" className="btn" style={{ display: 'block', margin: '0 16px', width: 'calc(100% - 32px)', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none', background: '#25d366', color: '#0f1628' }}>
              Chat with {shop.owner} on WhatsApp
            </a>
          )}
        </>
      )}
    </div>
  );
}
