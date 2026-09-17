import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Home
      </NavLink>
      <NavLink to="/wallet" className={({ isActive }) => (isActive ? 'active' : '')}>
        Wallet
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
        Orders
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
        Profile
      </NavLink>
    </nav>
  );
}
