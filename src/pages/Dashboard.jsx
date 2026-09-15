import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance } from '../api';
import BottomNav from '../components/BottomNav';

const SERVICES = [
  { slug: 'airtime', label: 'Airtime', icon: '📱' },
  { slug: 'data', label: 'Data', icon: '📶' },
  { slug: 'electricity', label: 'Electricity', icon: '⚡' },
  { slug: 'cable', label: 'Cable TV', icon: '📺' },
  { slug: 'education', label: 'Education', icon: '🎓' },
];

export default function Dashboard() {
  const { customer } = useAuth();
  const [balance, setBalance] = useState(customer?.walletBalance ?? 0);

  useEffect(() => {
    getWalletBalance()
      .then((data) => setBalance(data.walletBalance))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Hi, {customer?.name?.split(' ')[0] || 'there'}</h1>
        <p>What would you like to buy today?</p>
      </div>

      <div className="card stat-card">
        <div className="label">Wallet Balance</div>
        <div className="value">₦{Number(balance).toLocaleString()}</div>
        <Link to="/wallet" className="btn btn-secondary" style={{ display: 'block', marginTop: 12, textAlign: 'center', textDecoration: 'none' }}>
          Fund Wallet
        </Link>
      </div>

      <div className="service-grid">
        {SERVICES.map((s) => (
          <Link key={s.slug} to={`/buy/${s.slug}`} className="service-tile">
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            {s.label}
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
