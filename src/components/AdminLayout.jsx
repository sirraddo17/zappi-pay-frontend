import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/pending-funding', label: 'Pending Funding' },
  { to: '/admin/airtime-cash', label: 'Airtime to Cash' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/support', label: 'Support' },
  { to: '/admin/broadcasts', label: 'Broadcasts' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/audit-log', label: 'Audit Log' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <div style={{ padding: '0 20px 16px', fontWeight: 700 }}>ZAPPI PAY</div>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ color: 'var(--slate-400)', fontSize: 13, marginBottom: 8 }}>{admin?.name}</div>
          <button className="btn-secondary btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      <div className="admin-main">{children}</div>
    </div>
  );
}
