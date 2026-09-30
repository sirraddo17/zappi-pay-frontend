import { NavLink } from 'react-router-dom';
import { useLang } from '../lib/i18n';
import { HomeIcon, WalletIcon, ReceiptIcon, ProfileIcon } from './Icons';

const TABS = [
  { to: '/', end: true, label: 'Home', Icon: HomeIcon },
  { to: '/wallet', label: 'Wallet', Icon: WalletIcon },
  { to: '/orders', label: 'Orders', Icon: ReceiptIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function BottomNav() {
  const t = useLang();
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, end, label, Icon }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              {isActive && <span className="nav-dot" />}
              <Icon size={20} color={isActive ? 'var(--purple)' : 'var(--slate-400)'} />
              {t(label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
