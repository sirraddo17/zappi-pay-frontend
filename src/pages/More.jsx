import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n';
import { FundIcon, PrinterIcon, PhoneIcon, WifiIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';
import { useAppInfo, useFeatures } from '../components/ServiceNotices';
import { homeServices } from '../lib/homeTiles';

// Home → More. New services go here so the home screen stays short.
const ITEMS = [
  { group: 'together', to: '/circles', label: 'Ajo Circle', note: 'Save together: ajo, esusu, adashe — paid in turn', emoji: '🔄', bg: '#b45309', feature: 'circles' },
  { group: 'pay', to: '/bills', label: 'More bills', note: 'Tax, waste, water, tolls, school & professional fees', emoji: '🧾', bg: '#0e7490', feature: 'moreBills' },
  { group: 'biz', to: '/tickets', label: 'Event tickets', note: 'Sell or buy tickets — QR check-in at the door', emoji: '🎟️', bg: '#7c2d12', feature: 'tickets' },
  { group: 'biz', to: '/sms', label: 'Bulk SMS', note: 'Send alerts to your customers or members', emoji: '📩', bg: '#1e3a8a', feature: 'bulkSms' },
  { group: 'together', to: '/spray', label: 'Owambe Spray', note: 'Guests spray money from their phones at your party', emoji: '💃', bg: '#9d174d', feature: 'spray' },
  { group: 'together', to: '/dues', label: 'Association Dues', note: 'Estate, church, alumni & club dues with reminders', emoji: '🏘️', bg: '#155e75', feature: 'dues' },
  { group: 'together', to: '/pay-for-me', label: 'Pay It For Me', note: 'Ask someone to pay your light, data or TV', emoji: '🙏', bg: '#be185d', feature: 'payForMe' },
  { group: 'together', to: '/shared-light', label: 'Shared Light', note: 'Housemates fill one pot — the token buys itself', emoji: '💡', bg: '#a16207', feature: 'sharedLight' },
  { group: 'biz', to: '/safebuy', label: 'SafeBuy', note: 'Buy & sell online — money held till delivery', emoji: '🛡️', bg: '#065f46', feature: 'safeBuy' },
  { group: 'biz', to: '/payroll', label: 'Payroll', note: 'Pay your staff in one tap', emoji: '💼', bg: '#334155', feature: 'payroll' },
  { group: 'biz', to: '/connected-apps', label: 'Connected apps', note: 'Pay suppliers from StoreWatch', emoji: '🔗', bg: '#0D9488', feature: 'connectedApps' },
  { group: 'earn', to: '/rewards', label: 'Daily rewards', note: 'Check in & answer a question for cashback', emoji: '🎁', bg: '#be185d', feature: 'dailyRewards' },
  { group: 'together', to: '/requests', label: 'Request money', note: 'Pay me links, split bills, group gifts', emoji: '💸', bg: '#1f6b4a', feature: 'requests' },
  { group: 'pay', to: '/buy/betting', label: 'Bet Funding', note: 'Fund your betting wallet', emoji: '🏆', bg: '#a38a0a' },
  { group: 'pay', to: '/international', label: 'International airtime', note: 'Top up phones abroad, pay in naira', emoji: '🌍', bg: '#0f4c8c' },
  { group: 'pay', to: '/insurance', label: 'Car insurance', note: 'Third-party motor insurance in minutes', emoji: '🚗', bg: '#8c3b0f' },
  { group: 'pay', to: '/disputes', label: 'Wrong transfer', note: 'Sent money to the wrong person? Report it here', emoji: '↩️', bg: '#b45309', needsSend: true },
  { group: 'pay', to: '/airtime-cash', label: 'Airtime to Cash', note: 'Turn extra airtime into wallet money', Icon: FundIcon, bg: '#0E7490' },
  { group: 'biz', to: '/exam-pins', label: 'Exam PINs (bulk)', note: 'Buy & print many WAEC result checkers at once', emoji: '🎓', bg: '#0b6b3a' },
  { group: 'biz', to: '/print-cards', label: 'Print Cards', note: 'Buy recharge card PINs to print and sell', Icon: PrinterIcon, bg: '#0f6d8c' },
  { group: 'biz', to: '/bulk', label: 'Bulk airtime & data', note: 'Top up up to 50 numbers at once', Icon: PhoneIcon, bg: '#14b8a6', tag: 'AGENTS' },
  { group: 'pay', to: '/deals', label: 'Best data deals', note: 'The most data for your budget', Icon: WifiIcon, bg: '#7a5a10' },
  { group: 'earn', to: '/refer', label: 'Refer & Earn', note: 'Invite friends and earn', emoji: '🎁', bg: '#a3316f' },
  { group: 'together', to: '/family', label: 'Family wallet', note: 'Give family members money with limits', emoji: '👨‍👩‍👧', bg: '#1f6b4a', feature: 'family' },
];

const GROUPS = [
  ['pay', 'Pay & top up'],
  ['biz', 'For your business'],
  ['together', 'Money with others'],
  ['earn', 'Earn & rewards'],
];

export default function More() {
  const t = useLang();
  const appInfo = useAppInfo();
  const features = useFeatures();
  // The same core list as Home (Send Money / Bet Funding only when on).
  const CORE = ['airtime', 'data', 'electricity', 'cable', 'education', 'transfer', 'internet', 'betting'].map((slug) => ({ slug }));
  const home = homeServices(CORE, features, appInfo);
  const onHomeCore = new Set(home.tiles.filter((t) => !t.to).map((t) => t.slug));
  const items = ITEMS.filter((s) => !home.onHome.includes(s.to) && (s.to !== '/international' || appInfo?.intlAirtime) && (s.to !== '/buy/betting' || (features.betFunding && !onHomeCore.has('betting'))) && (!s.feature || features[s.feature]) && (!s.needsSend || features.sendMoney || appInfo?.bankTransfer));
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const found = s ? items.filter((x) => `${x.label} ${x.note}`.toLowerCase().includes(s)) : items;
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <h1>{t('More services')}</h1>
        <p>{items.length} services in one wallet</p>
      </div>
      {items.length > 8 && <input className="plan-search more-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services (e.g. print, bulk, insurance)" aria-label="Search services" style={{ width: 'calc(100% - 32px)' }} />}
      {GROUPS.map(([key, title]) => {
        const list = found.filter((x) => x.group === key);
        if (!list.length) return null;
        return (
          <section key={key} className="more-group">
            <h2>{title}</h2>
            <div className="more-list">
              {list.map((x) => (
                <Link key={x.to} to={x.to} className="more-row">
                  <span className="more-ico" style={{ background: `${x.bg}33`, color: `color-mix(in srgb, ${x.bg} 45%, white)`, border: `1px solid ${x.bg}66` }}>
                    {x.Icon ? <x.Icon size={21} color="currentColor" /> : <span aria-hidden="true">{x.emoji}</span>}
                  </span>
                  <span className="more-txt"><b>{t(x.label)}</b><small>{x.note}</small></span>
                  {x.tag && <span className="more-tag">{x.tag}</span>}
                  <span className="more-chev" aria-hidden>›</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {s && !found.length && <p className="empty-state">No service matches “{q}”.</p>}
      <BottomNav />
    </div>
  );
}
