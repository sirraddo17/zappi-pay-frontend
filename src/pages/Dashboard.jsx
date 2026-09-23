import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance, getWalletTransactions, getNotifications, getPricing, getActiveBroadcasts } from '../api';
import BottomNav from '../components/BottomNav';
import { LogoIcon, Wordmark } from '../components/Logo';
import { BellIcon, FundIcon, PhoneIcon, WifiIcon, BoltIcon, TvIcon, CapIcon, BuildingIcon, GlobeIcon, TrophyIcon } from '../components/Icons';

const SERVICES = [
  { slug: 'airtime', service: 'AIRTIME', label: 'Airtime', Icon: PhoneIcon, bg: '#863bff' },
  { slug: 'data', service: 'DATA', label: 'Data', Icon: WifiIcon, bg: '#7a5a10' },
  { slug: 'electricity', service: 'ELECTRICITY', label: 'Electricity', Icon: BoltIcon, bg: '#1f6b4a' },
  { slug: 'cable', service: 'CABLE', label: 'Cable TV', Icon: TvIcon, bg: '#2955a3' },
  { slug: 'education', service: 'EDUCATION', label: 'Education', Icon: CapIcon, bg: '#8c2f4a' },
  { slug: 'transfer', label: 'Send Money', Icon: BuildingIcon, bg: '#1a7a72' },
  { slug: 'internet', service: 'INTERNET', label: 'Internet', Icon: GlobeIcon, bg: '#c2540f' },
  { slug: 'betting', service: 'BETTING', label: 'Bet Funding', Icon: TrophyIcon, bg: '#a38a0a' },
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
  const { customer } = useAuth();
  const [balance, setBalance] = useState(customer?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [discounts, setDiscounts] = useState({});
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  function dismissBanner(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(next);
  }

  useEffect(() => {
    getWalletBalance()
      .then((data) => setBalance(data.walletBalance))
      .catch(() => {});
    getWalletTransactions()
      .then((data) => setTransactions((data.transactions || []).slice(0, 5)))
      .catch(() => setTransactions([]));
    getNotifications()
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
    getActiveBroadcasts()
      .then((data) => setBanners(data.broadcasts || []))
      .catch(() => {});
    getPricing()
      .then((data) => setDiscounts(data.discountPercentByService || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <div className="dash-header">
        <div className="dash-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoIcon size={30} />
            <Wordmark size={17} />
          </div>
          <Link to="/notifications" style={{ position: 'relative', display: 'inline-flex' }}>
            <BellIcon size={22} color="#fff" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  border: '1.5px solid var(--purple)',
                }}
              />
            )}
          </Link>
        </div>
        <p className="dash-greeting">Hi, {customer?.name?.split(' ')[0] || 'there'} 👋</p>
        <h1 className="dash-question">What would you like today?</h1>
      </div>

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

      <div className="wallet-card">
        <div className="label">Wallet Balance</div>
        <div className="value">₦{Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <Link to="/wallet" className="fund-btn">
          <FundIcon size={16} />
          Fund Wallet
        </Link>
      </div>

      <div className="section-label">Services</div>
      <div className="service-grid">
        {SERVICES.map((s) => {
          const Icon = s.Icon;
          const off = s.service ? Number(discounts[s.service] || 0) : 0;
          return (
            <Link key={s.slug} to={s.slug === 'transfer' ? '/transfer' : s.comingSoon ? '#' : `/buy/${s.slug}`} className="service-tile" style={{ position: 'relative' }}>
              {off > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'var(--gold)',
                    color: '#1a0b3d',
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 6,
                    lineHeight: 1.2,
                  }}
                >
                  {off}% OFF
                </span>
              )}
              <div className="service-icon" style={{ background: s.bg }}>
                <Icon size={22} color="#fff" />
              </div>
              {s.label}
            </Link>
          );
        })}
      </div>

      <div className="section-label">Recent Transactions</div>
      <div className="tx-list">
        {transactions === null ? (
          <p className="empty-state">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          transactions.map((t) => {
            const isCredit = t.type === 'FUND' || t.type === 'REFUND';
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

      <BottomNav />
    </div>
  );
}
