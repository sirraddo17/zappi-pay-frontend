import { useEffect, useRef } from 'react';
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
  const mainRef = useRef(null);

  // On phones the admin tables are shown as stacked cards (see
  // index.css); each cell needs its column name as data-label for
  // that. Filled in here for every table on every admin page, and kept
  // up to date as tables load or change.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return undefined;
    const label = () => {
      root.querySelectorAll('table').forEach((table) => {
        const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        if (!heads.length) return;
        table.querySelectorAll('tbody tr').forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            const l = heads[i] ?? '';
            if (td.getAttribute('data-label') !== l) td.setAttribute('data-label', l);
          });
        });
      });
    };
    label();
    const obs = new MutationObserver(label);
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Keep the active tab visible in the swipeable mobile tab bar.
  useEffect(() => {
    document.querySelector('.admin-sidebar a.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, []);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <div className="admin-brand" style={{ padding: '0 20px 16px', fontWeight: 700 }}>ZAPPI PAY</div>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
        <div className="admin-account" style={{ padding: '16px 20px 0' }}>
          <div className="admin-name" style={{ color: 'var(--slate-400)', fontSize: 13, marginBottom: 8 }}>{admin?.name}</div>
          <button className="btn-secondary btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      <div className="admin-main" ref={mainRef}>{children}</div>
    </div>
  );
}
