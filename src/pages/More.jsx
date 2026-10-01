import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n';
import { FundIcon, PrinterIcon, PhoneIcon, WifiIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import { useAppInfo } from '../components/ServiceNotices';

// Home → More. New services go here so the home screen stays short.
const ITEMS = [
  { to: '/requests', label: 'Request money', note: 'Pay me links, split bills, group gifts', emoji: '💸', bg: '#1f6b4a' },
  { to: '/international', label: 'International airtime', note: 'Top up phones abroad, pay in naira', emoji: '🌍', bg: '#0f4c8c' },
  { to: '/insurance', label: 'Car insurance', note: 'Third-party motor insurance in minutes', emoji: '🚗', bg: '#8c3b0f' },
  { to: '/airtime-cash', label: 'Airtime to Cash', note: 'Turn extra airtime into wallet money', Icon: FundIcon, bg: '#5b3fa8' },
  { to: '/exam-pins', label: 'Exam PINs (bulk)', note: 'Buy & print many WAEC result checkers at once', emoji: '🎓', bg: '#0b6b3a' },
  { to: '/print-cards', label: 'Print Cards', note: 'Buy recharge card PINs to print and sell', Icon: PrinterIcon, bg: '#0f6d8c' },
  { to: '/bulk', label: 'Bulk airtime & data', note: 'Top up up to 50 numbers at once', Icon: PhoneIcon, bg: '#863bff' },
  { to: '/deals', label: 'Best data deals', note: 'The most data for your budget', Icon: WifiIcon, bg: '#7a5a10' },
  { to: '/refer', label: 'Refer & Earn', note: 'Invite friends and earn', emoji: '🎁', bg: '#a3316f' },
  { to: '/family', label: 'Family wallet', note: 'Give family members money with limits', emoji: '👨‍👩‍👧', bg: '#1f6b4a' },
];

export default function More() {
  const t = useLang();
  const appInfo = useAppInfo();
  const items = ITEMS.filter((s) => s.to !== '/international' || appInfo?.intlAirtime);
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>{t('More services')}</h1>
      </div>
      <div className="service-grid">
        {items.map((s) => (
          <Link key={s.to} to={s.to} className="service-tile" title={s.note}>
            <div className="service-icon" style={{ background: s.bg }}>
              {s.Icon ? <s.Icon size={22} color="#fff" /> : <span style={{ fontSize: 20 }} aria-hidden="true">{s.emoji}</span>}
            </div>
            {t(s.label)}
          </Link>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
