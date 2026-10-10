import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReferrals } from '../api';
import BottomNav from '../components/BottomNav';
import SetUsername from '../components/SetUsername';
import ContestCard from '../components/ContestCard';
import ShareHub from '../components/ShareHub';
import MyQr from '../components/MyQr';
import useAutoRefresh from '../lib/useAutoRefresh';
import { useShowMore } from '../components/ShowMore';
import { useAuth } from '../context/AuthContext';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Refer() {
  const [data, setData] = useState(null);
  const refPage = useShowMore(data?.referrals);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const { customer } = useAuth();
  function load() {
    getMyReferrals()
      .then((d) => { setData(d); setError(''); })
      .catch((err) => { if (!data) setError(err.message); });
  }
  useEffect(load, []);
  // Rewards show up as soon as a friend qualifies (on return / push).
  useAutoRefresh(load, false);

  const link = data?.code ? `${window.location.origin}/signup?ref=${data.code}` : '';

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
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
      {!data && !error && <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>}

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
                  {data.spendTarget > 0
                    ? <>for every friend who signs up with your code and spends {naira(data.spendTarget)} in total on airtime, data, internet, TV or light. Paid instantly the moment they reach it.</>
                    : data.friendFunded
                    ? <>for every friend who signs up with your code and keeps using ZAPPI PAY. It's paid after a few purchases, starting with one of {naira(data.minPurchase)} or more.</>
                    : <>for every friend who signs up with your code and makes their first purchase or bank transfer of {naira(data.minPurchase)} or more.</>}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14 }}>
                Referral rewards are paused right now. You can still share your code — we'll announce when bonuses are back.
              </p>
            )}
          </div>

          <ContestCard />

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
              <MyQr code={data.code} link={link} />
            </div>
          ) : (
            <SetUsername onDone={(username) => setData((d) => ({ ...d, code: username }))} />
          )}

          {data.code && <ShareHub code={data.code} link={link} firstName={customer?.name?.split(' ')[0]} bonus={data.enabled ? data.bonusAmount : 0} minPurchase={data.minPurchase} spendTarget={data.spendTarget} />}

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
              refPage.visible.map((r, i) => (
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
                      textAlign: 'right',
                      background: r.rewarded || r.purchased ? 'rgba(34,197,94,0.15)' : 'rgba(255,184,48,0.15)',
                      color: r.rewarded || r.purchased ? 'var(--green-500)' : 'var(--gold)',
                    }}
                  >
                    {r.rewarded
                      ? `+${naira(r.amount)}`
                      : r.purchased
                        ? (!data.enabled ? '✓ Purchased (bonus paused)' : r.progress != null ? `⏳ ${r.progress}% to your bonus` : '✓ Purchased — bonus on the way')
                        : data.spendTarget > 0 ? 'Waiting: first purchase' : `Waiting: first ${naira(data.minPurchase)}+ purchase`}
                  </span>
                </div>
              ))
            )}
            {refPage.more}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>How it works</h2>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: 'var(--slate-100)' }}>
              <li>Share your code or invite link.</li>
              <li>Your friend signs up and enters your code (the link fills it in for them).</li>
              {data.spendTarget > 0 ? (
                <li>Every airtime, data, internet, TV or light purchase they make counts. When their total reaches {naira(data.spendTarget)}, your {naira(data.bonusAmount)} lands in your wallet instantly (see the % next to their name).</li>
              ) : data.friendFunded ? (
                <li>After their first purchase or bank transfer of {naira(data.minPurchase)} or more, every purchase they make moves your bonus closer (see the % next to their name). When it reaches 100%, your bonus lands in your wallet automatically.</li>
              ) : (
                <li>When they make their first purchase or bank transfer of {naira(data.minPurchase)} or more, your bonus lands in your wallet automatically.</li>
              )}
            </ol>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
