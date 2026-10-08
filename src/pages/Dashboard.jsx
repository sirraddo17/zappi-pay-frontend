import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import TestModeBanner from '../components/TestModeBanner';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cached } from '../lib/cache';
import useAutoRefresh from '../lib/useAutoRefresh';
import ContestCard from '../components/ContestCard';
import ChallengesCard from '../components/ChallengesCard';
import RenewalsCard from '../components/RenewalsCard';
import GettingStarted, { hiddenBefore as gsHidden } from '../components/GettingStarted';
import { LiteSuggestion } from '../components/LiteToggle';
import { useLite } from '../lib/lite';
import { AdsCarousel, AdPopup, DEFAULT_BOTTOM_SLIDES } from '../components/Ads';
import { getCashback, getWalletBalance, getWalletTransactions, getNotifications, getPricing, getActiveBroadcasts, getReferralInfo, getOrders } from '../api';
import { buyAgainLink, SERVICE_LABEL } from '../lib/repeat';
import BottomNav from '../components/BottomNav';
import { networkOf, NETWORK_STYLE } from '../lib/network';
import ServiceNotices, { useFeatures, useAppInfo } from '../components/ServiceNotices';
import LoyaltyCard from '../components/LoyaltyCard';
import PushToggle from '../components/PushToggle';
import { LogoIcon, Wordmark } from '../components/Logo';
import { BellIcon, FundIcon, PhoneIcon, WifiIcon, BoltIcon, TvIcon, CapIcon, BuildingIcon, GlobeIcon, TrophyIcon, GridIcon } from '../components/Icons';

const SERVICES = [
  { slug: 'airtime', service: 'AIRTIME', label: 'Airtime', Icon: PhoneIcon, bg: '#863bff' },
  { slug: 'data', service: 'DATA', label: 'Data', Icon: WifiIcon, bg: '#7a5a10' },
  { slug: 'electricity', service: 'ELECTRICITY', label: 'Electricity', Icon: BoltIcon, bg: '#1f6b4a' },
  { slug: 'cable', service: 'CABLE', label: 'Cable TV', Icon: TvIcon, bg: '#2955a3' },
  { slug: 'education', service: 'EDUCATION', label: 'Education', Icon: CapIcon, bg: '#8c2f4a' },
  { slug: 'transfer', label: 'Send Money', Icon: BuildingIcon, bg: '#1a7a72' },
  { slug: 'internet', service: 'INTERNET', label: 'Internet', Icon: GlobeIcon, bg: '#c2540f' },
  { slug: 'betting', service: 'BETTING', label: 'Bet Funding', Icon: TrophyIcon, bg: '#a38a0a' },
  // Everything else (Airtime to Cash, Print Cards, and new services) lives under More.
  { slug: 'more', to: '/more', label: 'More', Icon: GridIcon, bg: '#5b3fa8' },
];

function fmtTxDate(d) {
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

function txLabel(t) {
  if (t.type === 'FUND') return 'Wallet funded';
  if (t.type === 'REFUND') return t.note || 'Refund';
  if (t.type === 'AIRTIME_CASH') return t.note || 'Airtime to Cash';
  if (t.type === 'REFERRAL_BONUS') return t.note || 'Referral bonus';
  if (t.type === 'CASHBACK') return t.note || 'Cashback';
  if (t.type === 'LOYALTY') return t.note || 'Points redeemed';
  if (t.type === 'CONTEST_PRIZE') return t.note || 'Contest prize';
  if (t.type === 'COUPON') return t.note || 'Coupon';
  if (t.type === 'TRANSFER_IN') return t.note || 'Money received';
  if (t.type === 'TRANSFER_OUT') return t.note || 'Money sent';
  if (t.type === 'SAVINGS_IN') return 'Moved to savings';
  if (t.type === 'SAVINGS_OUT') return 'From savings';
  if (t.type === 'INTEREST') return 'Savings interest';
  if (t.type === 'CHALLENGE_REWARD') return t.note || 'Challenge reward';
  if (t.type === 'DELIVERY_BONUS') return 'Delivery promise bonus';
  if (t.type === 'SHOP_COMMISSION') return t.note || 'Shop commission';
  return t.note || 'Purchase';
}

const BANNER_STYLES = {
  INFO: { bg: 'rgba(134,59,255,0.15)', border: 'var(--purple)', icon: 'ℹ️' },
  WARNING: { bg: 'rgba(255,184,48,0.15)', border: 'var(--gold)', icon: '⚠️' },
  MAINTENANCE: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', icon: '🛠️' },
};

// Which banners this customer has closed — kept per browser only,
// since closing a banner is a personal convenience, not something
// the admin needs to know about. Wrapped in try/catch because
// storage can be unavailable (private mode, blocked site data).
const DISMISSED_KEY = 'zappipay_dismissed_broadcasts';
function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeDismissed(ids) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // ignore — banner just reappears next visit
  }
}

export default function Dashboard() {
  const t = useLang();
  const feat = useFeatures();
  const info = useAppInfo();
  // "Send Money" only shows when sending to users or to banks is switched on.
  const all = SERVICES.filter((s) => (s.slug !== 'transfer' || feat.sendMoney || info?.bankTransfer) && (s.slug !== 'betting' || feat.betFunding));
  // Always 8 tiles with More pinned last, so nothing jumps when settings load.
  const services = [...all.filter((s) => s.slug !== 'more').slice(0, 7), SERVICES.find((s) => s.slug === 'more')];
  const lite = useLite();
  const { customer } = useAuth();
  const [balance, setBalance] = useState(customer?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [discounts, setDiscounts] = useState({});
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [referral, setReferral] = useState(null);
  const [recent, setRecent] = useState([]);
  const [bought, setBought] = useState(null); // null = not loaded yet
  const [gsOff, setGsOff] = useState(gsHidden);
  const [cashback, setCashback] = useState(customer?.cashbackBalance ?? 0);
  const [monthCashback, setMonthCashback] = useState(0);
  const [hide, setHide] = useState(() => { try { return localStorage.getItem('zp_hide_balance') === '1'; } catch { return false; } });
  function toggleHide() { setHide((h) => { try { localStorage.setItem('zp_hide_balance', h ? '0' : '1'); } catch { /* private mode */ } return !h; }); }

  function dismissBanner(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(next);
  }

  // Balance and recent activity update when the app comes back to the
  // front or a push notification arrives.
  useAutoRefresh(() => {
    getWalletBalance().then((d) => { setBalance(d.walletBalance); setCashback(Number(d.cashbackBalance || 0)); }).catch(() => {});
    getWalletTransactions().then((d) => setTransactions((d.transactions || []).slice(0, 5))).catch(() => {});
    getNotifications().then((d) => setUnreadCount(d.unreadCount || 0)).catch(() => {});
  }, false);

  useEffect(() => {
    // Last known values show instantly; fresh ones replace them.
    const k = (name) => `${customer?.id || 'me'}:${name}`;
    cached(k('balance'), getWalletBalance, (data) => { setBalance(data.walletBalance); setCashback(Number(data.cashbackBalance || 0)); }).catch(() => {});
    getCashback().then((d) => {
      const m = new Date(); const from = new Date(m.getFullYear(), m.getMonth(), 1);
      setMonthCashback(Math.round((d.entries || []).filter((e) => e.amount > 0 && new Date(e.createdAt) >= from).reduce((t, e) => t + e.amount, 0) * 100) / 100);
    }).catch(() => {});
    cached(k('tx'), getWalletTransactions, (data) => setTransactions((data.transactions || []).slice(0, 5)))
      .catch(() => setTransactions((t) => t || []));
    getNotifications()
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
    cached(k('banners'), getActiveBroadcasts, (data) => setBanners(data.broadcasts || [])).catch(() => {});
    cached(k('pricing'), getPricing, (data) => setDiscounts(data.discountPercentByService || {})).catch(() => {});
    cached(k('referral'), getReferralInfo, setReferral).catch(() => {});
    // Last few distinct successful purchases, for one-tap "Buy again".
    cached(k('recent'), () => getOrders().then((data) => {
      const seen = new Set();
      const list = [];
      const any = (data.orders || []).some((o) => o.status === 'SUCCESS');
      for (const o of data.orders || []) {
        if (o.status !== 'SUCCESS') continue;
        const key = `${o.service}|${o.provider}|${o.recipient}|${o.variationCode || o.costAmount}`;
        if (seen.has(key) || !buyAgainLink(o)) continue;
        seen.add(key);
        list.push(o);
        if (list.length >= 6) break;
      }
      return { list, any };
    }), (v) => { const list = Array.isArray(v) ? v : (v?.list || []); setRecent(list); setBought(Array.isArray(v) ? list.length > 0 : Boolean(v?.any)); }).catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <div className="dash-hero">
        <div className="dash-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoIcon size={30} />
            <Wordmark size={17} />
          </div>
          <Link to="/notifications" aria-label="Notifications" className="hero-bell">
            <BellIcon size={20} color="#fff" />
            {unreadCount > 0 && <span className="hero-bell-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Link>
        </div>
        <p className="dash-greeting">
          {greeting()}, {customer?.name?.split(' ')[0] || 'there'} {greetEmoji()}
          {customer?.isAgent && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,184,46,0.2)', color: 'var(--gold, #f5b82e)' }}>⭐ AGENT</span>}
        </p>
        <div className="glass-wallet">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">{t('Wallet Balance')}</span>
            <button type="button" className="eye-btn" onClick={toggleHide} aria-label={hide ? 'Show balance' : 'Hide balance'}>{hide ? '🙈' : '👁️'}</button>
          </div>
          <div className="value">{hide ? '₦ ••••••' : <CountUp value={Number(balance)} />}</div>
          {(cashback > 0 || monthCashback > 0) && !hide && (
            <Link to="/wallet" className="cb-chip">🎁 {cashback > 0 ? `₦${Number(cashback).toLocaleString()} cashback to spend` : ''}{cashback > 0 && monthCashback > 0 ? ' · ' : ''}{monthCashback > 0 ? `₦${Number(monthCashback).toLocaleString()} earned this month` : ''}</Link>
          )}
          <div className="hero-actions">
            <Link to="/wallet" className="hero-action primary"><FundIcon size={18} color="#1a0b3d" /><span>Add money</span></Link>
            <Link to="/buy/airtime" className="hero-action"><PhoneIcon size={18} color="#fff" /><span>{t('Airtime')}</span></Link>
            <Link to="/buy/data" className="hero-action"><WifiIcon size={18} color="#fff" /><span>{t('Data')}</span></Link>
            <Link to="/orders" className="hero-action"><GridIcon size={18} color="#fff" /><span>History</span></Link>
          </div>
        </div>
      </div>

      <div className="service-grid four">
        {services.map((s) => {
          const Icon = s.Icon;
          const off = s.service ? Number(discounts[s.service] || 0) : 0;
          return (
            <Link key={s.slug} to={s.to || (s.slug === 'transfer' ? '/transfer' : s.comingSoon ? '#' : `/buy/${s.slug}`)} className="service-tile" style={{ position: 'relative' }}>
              {off > 0 && <span className="off-badge">{off}% OFF</span>}
              <div className="service-icon" style={{ background: s.bg }}>
                <Icon size={22} color="#fff" />
              </div>
              <span className="service-label">{t(s.label)}</span>
            </Link>
          );
        })}
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>{t('Buy again')}</span>
            <Link to="/saved" style={{ fontSize: 12, color: 'var(--purple)', textDecoration: 'none', textTransform: 'none', letterSpacing: 0 }}>Saved &amp; Scheduled</Link>
          </div>
          <div className="chip-scroll">
            {recent.map((o) => {
              const net = networkOf(o.provider);
              const st = NETWORK_STYLE[net];
              return (
                <Link key={o.id} to={buyAgainLink(o)} className="again-chip">
                  <span className="again-dot" style={{ background: st?.bg || 'var(--purple)', color: st?.fg || '#fff' }}>{st ? st.name[0] : (SERVICE_LABEL[o.service] || '?')[0]}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{SERVICE_LABEL[o.service]} · ₦{Number(o.amount).toLocaleString()}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.recipient || o.provider}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <ServiceNotices generalOnly />
      <RenewalsCard />
      <DailyRewardsHome />

      {banners.filter((b) => !dismissed.includes(b.id)).map((b) => {
        const st = BANNER_STYLES[b.type] || BANNER_STYLES.INFO;
        return (
          <div
            key={b.id}
            className="card"
            style={{ background: st.bg, border: `1px solid ${st.border}`, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}
          >
            <span style={{ fontSize: 18, lineHeight: 1.2 }}>{st.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
              <div style={{ fontSize: 13, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.message}</div>
            </div>
            <button
              type="button"
              onClick={() => dismissBanner(b.id)}
              aria-label="Close announcement"
              style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        );
      })}
      <TestModeBanner style={{ margin: '16px 16px' }} />

      {!lite && <AdsCarousel />}
      {!lite && <AdPopup />}
      <LiteSuggestion />
      <PushToggle variant="nudge" />
      <LoyaltyCard />
      <div className="tools-row">
        <Link to="/deals" className="tool-card"><span className="tool-emoji">🔎</span><b>{t('Best data deals')}</b><small>Most data for your budget</small></Link>
        <Link to="/bulk" className="tool-card"><span className="tool-emoji">📶</span><b>{t('Bulk airtime & data')}</b><small>Up to 50 numbers at once</small></Link>
      </div>

      {customer && bought === false && !gsOff && <GettingStarted customer={customer} balance={balance} funded={(transactions || []).some((x) => x.type === 'FUND' && x.status === 'APPROVED')} onHide={() => setGsOff(true)} />}

      {customer && (bought !== false || gsOff) && !customer.username && (
        <Link
          to="/refer"
          className="card"
          style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit', border: '1px solid var(--purple, #863bff)', background: 'rgba(134,59,255,0.08)', marginTop: 16 }}
        >
          <span style={{ fontSize: 22 }}>🏷️</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: 14 }}>Choose your username</b>
            <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Get your referral code and let friends send you money with it.</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
      )}

      {customer && (bought !== false || gsOff) && !customer.hasPin && (
        <Link
          to="/security"
          className="card"
          style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit', border: '1px solid var(--gold)', background: 'rgba(255,184,48,0.08)', marginTop: 16 }}
        >
          <span style={{ fontSize: 22 }}>🔒</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: 14 }}>Create your transaction PIN</b>
            <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>You'll need it to confirm payments. Then turn on PIN or fingerprint login.</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
      )}

      {customer && customer.hasPin && (customer.hasDob === false || customer.hasSecurityQuestion === false) && (
        <Link
          to="/profile#security-details"
          className="card"
          style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit', border: '1px solid var(--gold)', background: 'rgba(255,184,48,0.08)', marginTop: 16 }}
        >
          <span style={{ fontSize: 22 }}>🛡️</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: 14 }}>Protect your account</b>
            <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Add your date of birth and a security question so support can confirm it's really you.</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
      )}

      {!lite && <ContestCard compact />}
      <ChallengesCard />

      {referral?.enabled && referral.bonusAmount > 0 && (
        <Link
          to="/refer"
          className="card"
          style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: '#fff', border: 'none', background: 'linear-gradient(135deg, #863bff, #5b1fc4)', marginTop: 16 }}
        >
          <span style={{ fontSize: 22 }}>🎁</span>
          <span style={{ flex: 1 }}>
            <b style={{ display: 'block', fontSize: 14 }}>Refer &amp; earn ₦{Number(referral.bonusAmount).toLocaleString()}</b>
            <span style={{ fontSize: 13, opacity: 0.85 }}>Invite friends — get paid when they make their first purchase.</span>
          </span>
          <span style={{ color: 'var(--gold)' }}>›</span>
        </Link>
      )}

      <div className="section-label">{t('Recent Transactions')}</div>
      {/* The bottom slider sits right under this list, so no big gap here;
          the slider keeps the space above the bottom menu instead. */}
      <div className="tx-list" style={{ marginBottom: 0 }}>
        {transactions === null ? (
          <div style={{ padding: 12 }}><SkeletonRows rows={3} h={44} /></div>
        ) : transactions.length === 0 ? (
          <div className="empty-hero"><div style={{ fontSize: 34 }}>🧾</div><b>No transactions yet</b><small>Fund your wallet and make your first purchase — it shows up here.</small></div>
        ) : (
          transactions.map((t) => {
            const isCredit = ['FUND', 'REFUND', 'TRANSFER_IN', 'AIRTIME_CASH', 'REFERRAL_BONUS', 'CASHBACK', 'LOYALTY', 'CONTEST_PRIZE', 'COUPON', 'SAVINGS_OUT', 'INTEREST', 'CHALLENGE_REWARD', 'DELIVERY_BONUS', 'SHOP_COMMISSION'].includes(t.type);
            return (
              <div className="tx-row" key={t.id}>
                <div className="tx-icon" style={{ background: isCredit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
                  {isCredit ? <FundIcon size={16} color="var(--green-500)" /> : <BoltIcon size={16} color="var(--red-500)" />}
                </div>
                <div className="tx-info">
                  <div className="tx-name">{txLabel(t)}</div>
                  <div className="tx-date">{fmtTxDate(t.createdAt)}</div>
                </div>
                <div className={`tx-amount ${isCredit ? 'credit' : 'debit'}`}>
                  {isCredit ? '+' : '−'}₦{Number(t.amount).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!lite && <AdsCarousel placement="BOTTOM" fallback={DEFAULT_BOTTOM_SLIDES} />}

      <BottomNav />
    </div>
  );
}

function DailyRewardsHome() {
  const features = useFeatures();
  if (!features.dailyRewards) return null;
  return (
    <Link to="/rewards" className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
      <span style={{ fontSize: 28 }}>🎁</span>
      <span style={{ flex: 1 }}><b>Daily rewards</b><br /><small style={{ color: 'var(--slate-400)' }}>Check in & answer today’s question for cashback</small></span>
      <span style={{ color: 'var(--purple)' }}>→</span>
    </Link>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-NG', { hour: 'numeric', hour12: false, timeZone: 'Africa/Lagos' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function greetEmoji() {
  const h = Number(new Date().toLocaleString('en-NG', { hour: 'numeric', hour12: false, timeZone: 'Africa/Lagos' }));
  return h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
}

// Balance counts up when it changes (skipped for "reduce motion").
function CountUp({ value }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return undefined; }
    let raf; const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      setShown(start + (value - start) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>₦{Number(shown).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}
