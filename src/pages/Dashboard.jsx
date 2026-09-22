import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance, getWalletTransactions } from '../api';
import BottomNav from '../components/BottomNav';
import { LogoIcon, Wordmark } from '../components/Logo';
import { BellIcon, FundIcon, PhoneIcon, WifiIcon, BoltIcon, TvIcon, CapIcon, BuildingIcon, GlobeIcon, TrophyIcon } from '../components/Icons';

const SERVICES = [
  { slug: 'airtime', label: 'Airtime', Icon: PhoneIcon, bg: '#863bff' },
  { slug: 'data', label: 'Data', Icon: WifiIcon, bg: '#7a5a10' },
  { slug: 'electricity', label: 'Electricity', Icon: BoltIcon, bg: '#1f6b4a' },
  { slug: 'cable', label: 'Cable TV', Icon: TvIcon, bg: '#2955a3' },
  { slug: 'education', label: 'Education', Icon: CapIcon, bg: '#8c2f4a' },
  { slug: 'transfer', label: 'Transfer', Icon: BuildingIcon, bg: '#1a7a72', comingSoon: true },
  { slug: 'internet', label: 'Internet', Icon: GlobeIcon, bg: '#c2540f' },
  { slug: 'betting', label: 'Bet Funding', Icon: TrophyIcon, bg: '#a38a0a' },
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

export default function Dashboard() {
  const { customer } = useAuth();
  const [balance, setBalance] = useState(customer?.walletBalance ?? 0);
  const [transactions, setTransactions] = useState(null);

  useEffect(() => {
    getWalletBalance()
      .then((data) => setBalance(data.walletBalance))
      .catch(() => {});
    getWalletTransactions()
      .then((data) => setTransactions((data.transactions || []).slice(0, 5)))
      .catch(() => setTransactions([]));
  }, []);

  return (
    <div className="app-shell">
      <div className="dash-header">
        <div className="dash-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoIcon size={30} />
            <Wordmark size={17} />
          </div>
          <BellIcon size={22} color="#fff" />
        </div>
        <p className="dash-greeting">Hi, {customer?.name?.split(' ')[0] || 'there'} 👋</p>
        <h1 className="dash-question">What would you like today?</h1>
      </div>

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
          return (
            <Link key={s.slug} to={s.comingSoon ? '#' : `/buy/${s.slug}`} className="service-tile">
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
