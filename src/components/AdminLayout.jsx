import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import InstallAppButton from './InstallAppButton';
import AdminAlertsToggle from './AdminAlertsToggle';
import { getPartnerModes, isDemoMode, setDemoMode, getAppInfo, getAdminFeatures } from '../api';

// Remembered while the admin app is open so every page doesn't re-ask.
let partnerCache = null;

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/money', label: '💰 Money check' },
  { to: '/admin/ledger', label: '📒 Ledger & refunds' },
  { to: '/admin/go-live', label: '🚦 Go-live check' },
  { to: '/admin/database', label: '🗄️ Server & Database' },
  { to: '/admin/subscriptions', label: '🧾 Subscriptions' },
  { to: '/admin/assistant', label: '✨ AI Assistant' },
  { to: '/admin/support-guide', label: '📘 Support guide' },
  { to: '/admin/pending-funding', label: 'Pending Funding' },
  { to: '/admin/airtime-cash', label: 'Airtime to Cash' },
  { to: '/admin/bank-transfers', label: 'Bank Transfers' },
  { to: '/admin/disputes', label: '↩️ Wrong transfers' },
  { to: '/admin/unmatched-payments', label: '💸 Unmatched payments' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/support', label: 'Support' },
  { to: '/admin/escalations', label: '✅ Approvals' },
  { to: '/admin/partners', label: '🤝 Partners' },
  { to: '/admin/broadcasts', label: 'Broadcasts' },
  { to: '/admin/notices', label: 'Service Notices' },
  { to: '/admin/promos', label: 'Promo Codes' },
  { to: '/admin/challenges', label: 'Challenges' },
  { to: '/admin/contests', label: '🏆 Referral Contests' },
  { to: '/admin/ads', label: '📣 In-app Ads' },
  { to: '/admin/ad-studio', label: '🎨 Ad Studio' },
  { to: '/admin/circles', label: '🔄 Ajo Circles' },
  { to: '/admin/features', label: '🧩 New features' },
  { to: '/admin/extra-services', label: '📩 SMS, Tickets & Bills' },
  { to: '/admin/feedback', label: '⭐ Feedback' },
  { to: '/admin/radar', label: '🔭 Radar' },
  { to: '/admin/security', label: '🛡️ Security' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/audit-log', label: 'Audit Log' },
  { to: '/admin/my-access', label: '🔒 Access & roles' },
];

// Menu items that belong to a feature. While the feature is switched off
// the item is hidden and its page shows a short "switched off" note (the
// code stays; switch the feature back on to see it again).
const GATED = {
  '/admin/airtime-cash': { what: 'Airtime to Cash', where: '🧩 New features', on: (f) => f.mode('airtimeToCash') },
  '/admin/bank-transfers': { what: 'Send to Bank', where: 'Settings → Wallet funding & payment partners → Monnify', on: (f) => f.bankTransfer },
  '/admin/disputes': { what: 'Send money and Send to Bank', where: '🧩 New features / Settings', on: (f) => f.mode('sendMoney') || f.bankTransfer },
  '/admin/pending-funding': { what: 'Manual funding (pay into our business account)', where: 'Settings → 🏦 Manual funding accounts', on: (f) => f.manualFunding },
  '/admin/circles': { what: 'Ajo Circle', where: '🧩 New features', on: (f) => f.mode('circles') },
  '/admin/extra-services': { what: 'Bulk SMS, Event tickets, More bills and Pay straight to their bank', where: '🧩 New features', on: (f) => ['bulkSms', 'tickets', 'moreBills', 'directPay'].some((k) => f.mode(k)) },
  '/admin/unmatched-payments': { what: 'Bank-transfer wallet funding', where: 'Settings → Wallet funding & payment partners', on: (f) => f.bankFunding },
};
let gateCache = null;
function useFeatureState(isOwner) {
  const [state, setState] = useState(gateCache);
  useEffect(() => {
    if (gateCache) return;
    Promise.all([getAppInfo(), isOwner ? getAdminFeatures().catch(() => null) : Promise.resolve(null)])
      .then(([info, admin]) => {
        const modes = Object.fromEntries((admin?.features || []).map((x) => [x.key, x.mode]));
        gateCache = {
          // ON or "Testers only" counts as on for the admin menu.
          mode: (key) => (modes[key] ? modes[key] !== 'OFF' : Boolean(info?.features?.[key])),
          bankTransfer: Boolean(info?.bankTransfer),
          manualFunding: Boolean(info?.manualAccounts?.length),
          bankFunding: Boolean(info?.funding?.bank),
        };
        setState(gateCache);
      })
      .catch(() => {});
  }, []);
  return state;
}

// What support staff (role SUPPORT) can open.
const SUPPORT_TABS = ['/admin/my-access', '/admin/support-guide', '/admin/assistant', '/admin/customers', '/admin/orders', '/admin/bank-transfers', '/admin/unmatched-payments', '/admin/support', '/admin/escalations'];

export default function AdminLayout({ children }) {
  const { admin, logout, isOwner } = useAdminAuth();
  const { pathname } = useLocation();
  const [demo, setDemo] = useState(isDemoMode());
  // Demo / screenshot mode: hides the Server & Database screen too.
  const feat = useFeatureState(isOwner);
  const featureOn = (to) => !GATED[to] || Boolean(feat && GATED[to].on(feat));
  const visible = TABS.filter((t) => (!demo || t.to !== '/admin/database') && featureOn(t.to));
  const offPage = Object.keys(GATED).find((p) => (pathname === p || pathname.startsWith(`${p}/`)) && feat && !GATED[p].on(feat));
  const tabs = isOwner ? visible : visible.filter((t) => SUPPORT_TABS.includes(t.to)).map((t) => (t.to === '/admin/escalations' ? { ...t, label: '✅ My requests' } : t.to === '/admin/assistant' ? { ...t, label: '✨ Support helper' } : t));
  const allowed = isOwner || SUPPORT_TABS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const navigate = useNavigate();
  const mainRef = useRef(null);
  // Each payment partner and whether it is on sandbox (test money) or live.
  const [partners, setPartners] = useState(partnerCache);
  useEffect(() => {
    if (partnerCache || !isOwner) return;
    getPartnerModes()
      .then((d) => { partnerCache = d; setPartners(d); })
      .catch(() => {});
  }, []);
  const anySandbox = Boolean(partners?.partners?.some((p) => p.on && p.mode !== 'live'));

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
            const l = td.hasAttribute('data-nolabel') ? '' : heads[i] ?? ''; // full-width detail rows get no label
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

  if (!isOwner && pathname === '/admin') return <Navigate to="/admin/support" replace />;

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <div className="admin-brand" style={{ padding: '0 20px 16px', fontWeight: 700 }}>ZAPPI PAY</div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
        <div className="admin-account" style={{ padding: '16px 20px 0' }}>
          <div className="admin-name" style={{ color: 'var(--slate-400)', fontSize: 13, marginBottom: 8 }}>{admin?.name}{!isOwner && ' · Support staff'}</div>
          {isOwner && <AdminAlertsToggle />}
          {isOwner && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '0 0 8px', cursor: 'pointer' }} title="For screenshots and showing the app: hides customer names, phone numbers, keys and test-money balances">
              <input type="checkbox" checked={demo} onChange={(e) => { setDemoMode(e.target.checked); setDemo(e.target.checked); window.location.reload(); }} style={{ width: 'auto' }} />
              🎭 Demo / screenshot mode
            </label>
          )}
          <InstallAppButton admin label="Install admin app" style={{ marginBottom: 8, fontSize: 13 }} />
          <button className="btn-secondary btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      <div className="admin-main" ref={mainRef}>
        {demo && (
          <div style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid var(--gold)', borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 13 }}>
            <strong>🎭 Demo mode:</strong> names, phone numbers, account numbers, keys and test-money (SANDBOX) balances are hidden. Turn it off in the menu.
          </div>
        )}
        {isOwner && anySandbox && (
          <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid var(--orange, #f97316)', color: 'var(--orange, #f97316)', borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 13 }}>
            <strong>Partner modes:</strong>{' '}
            {partners.partners.map((p, i) => (
              <span key={p.key}>
                {i > 0 ? ' · ' : ''}
                {p.name} — <b>{p.mode === 'live' ? 'LIVE' : 'SANDBOX (test money)'}</b>
                {!p.on ? ' (off for customers)' : p.what ? ` (${p.what})` : ''}
              </span>
            ))}
            {' · '}Send to Bank — <b>{partners.sendToBank ? 'ON' : 'OFF'}</b>.{' '}
            <Link to="/admin/go-live" style={{ color: 'inherit', textDecoration: 'underline' }}>Go live</Link>
          </div>
        )}
        {offPage ? (
          <div className="card" style={{ margin: 0, maxWidth: 520 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{GATED[offPage].what} is switched off</h2>
            <p style={{ color: 'var(--slate-400)' }}>This page is hidden while it’s off, and customers don’t see it either. To use it again, switch it on in {GATED[offPage].where}.</p>
            <NavLink to="/admin" className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Back to Overview</NavLink>
          </div>
        ) : allowed ? children : (
          <div className="card" style={{ margin: 0, maxWidth: 520 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Not available for support staff</h2>
            <p style={{ color: 'var(--slate-400)' }}>This part of the admin app is for owners. You can help customers from Customers, Orders and Support, and send anything sensitive for approval.</p>
            <NavLink to="/admin/support" className="btn" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Go to Support</NavLink>
          </div>
        )}
      </div>
    </div>
  );
}
