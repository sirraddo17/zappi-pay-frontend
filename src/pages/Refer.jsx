import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReferrals } from '../api';
import BottomNav from '../components/BottomNav';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Refer() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    getMyReferrals()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const link = data?.code ? `${window.location.origin}/signup?ref=${data.code}` : '';
  const shareText = data
    ? `Join me on ZAPPI PAY — buy airtime, data, electricity, cable TV and more in seconds. Sign up with my code ${data.code}: ${link}`
    : '';

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ZAPPI PAY', text: shareText, url: link });
        return;
      } catch {
        // cancelled — fall through to nothing
        return;
      }
    }
    copy(shareText, 'message');
  }

  const rewarded = data?.referrals?.filter((r) => r.rewarded).length || 0;

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/profile" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to profile
        </Link>
        <h1>Refer &amp; Earn</h1>
        <p>Invite friends to ZAPPI PAY</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="empty-state">Loading…</p>}

      {data && (
        <>
          <div
            className="card"
            style={{ background: 'linear-gradient(135deg, #863bff, #5b1fc4)', border: 'none', color: '#fff' }}
          >
            {data.enabled ? (
              <>
                <div style={{ fontSize: 13, opacity: 0.85 }}>You earn</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--gold)' }}>{naira(data.bonusAmount)}</div>
                <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.45 }}>
                  for every friend who signs up with your code and makes their first purchase of {naira(data.minPurchase)} or more.
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14 }}>
                Referral rewards are paused right now. You can still share your code — we'll announce when bonuses are back.
              </p>
            )}
          </div>

          {data.code ? (
            <div className="card">
              <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>Your referral code</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>{data.code}</span>
                <button className="btn-secondary btn" type="button" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => copy(data.code, 'code')}>
                  {copied === 'code' ? 'Copied!' : 'Copy code'}
                </button>
              </div>
              <div style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 14 }}>Your invite link</div>
              <div style={{ fontSize: 13, wordBreak: 'break-all', margin: '4px 0 10px' }}>{link}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="button" onClick={share}>
                  {copied === 'message' ? 'Copied!' : 'Share'}
                </button>
                <a
                  className="btn-secondary btn"
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textAlign: 'center', textDecoration: 'none' }}
                >
                  WhatsApp
                </a>
              </div>
              <button type="button" onClick={() => copy(link, 'link')} style={{ background: 'none', border: 'none', color: 'var(--purple)', marginTop: 10, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                {copied === 'link' ? 'Link copied!' : 'Copy link only'}
              </button>
            </div>
          ) : (
            <div className="card">
              <p style={{ margin: 0, fontSize: 14 }}>Your account doesn't have a username yet, which is used as your referral code. Please contact support to add one.</p>
            </div>
          )}

          <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{data.referrals.length}</div>
              <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>Joined</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{rewarded}</div>
              <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>Rewarded</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>{naira(data.totalEarned)}</div>
              <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>Earned</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Your referrals</h2>
            {data.referrals.length === 0 ? (
              <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>No one has joined with your code yet. Share it to start earning.</p>
            ) : (
              data.referrals.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>Joined {new Date(r.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: r.rewarded ? 'rgba(34,197,94,0.15)' : 'rgba(255,184,48,0.15)',
                      color: r.rewarded ? 'var(--green-500)' : 'var(--gold)',
                    }}
                  >
                    {r.rewarded ? `+${naira(r.amount)}` : 'Awaiting first purchase'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>How it works</h2>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: 'var(--slate-100)' }}>
              <li>Share your code or invite link.</li>
              <li>Your friend signs up and enters your code (the link fills it in for them).</li>
              <li>When they make their first purchase of {naira(data.minPurchase)} or more, your bonus lands in your wallet.</li>
            </ol>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
