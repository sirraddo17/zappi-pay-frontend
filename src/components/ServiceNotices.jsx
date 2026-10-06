import { useEffect, useState } from 'react';
import { getAppInfo, getMyFeatures } from '../api';

// Admin-posted notices, e.g. "MTN data is slow right now".
// service: show only notices for that service (plus general ones).
let cache = null;
let cachedAt = 0;

export function useAppInfo() {
  const [info, setInfo] = useState(cache);
  useEffect(() => {
    if (cache && Date.now() - cachedAt < 60 * 1000) return;
    getAppInfo()
      .then((i) => {
        cache = i;
        cachedAt = Date.now();
        setInfo(i);
      })
      .catch(() => {});
  }, []);
  return info;
}

// Which new features THIS customer can use: on-for-everyone ones, plus
// "testers only" ones when they're on the testers list.
let fCache = null;
let fAt = 0;
export function useFeatures() {
  const appInfo = useAppInfo();
  const [mine, setMine] = useState(fCache);
  useEffect(() => {
    if (fCache && Date.now() - fAt < 60 * 1000) return;
    let loggedIn = false;
    try { loggedIn = Boolean(localStorage.getItem('zappipay_customer_token')); } catch { /* private mode */ }
    if (!loggedIn) return;
    getMyFeatures().then((r) => { fCache = r.features || {}; fAt = Date.now(); setMine(fCache); }).catch(() => {});
  }, []);
  return { ...(appInfo?.features || {}), ...(mine || {}) };
}

// True (with the message) when this service can't be bought right now.
export function pausedFor(info, service) {
  const m = info?.maintenance;
  if (!m) return null;
  if (m.all || (service && m.services?.includes(service))) return m.message;
  return null;
}

const PAUSE_LABEL = { AIRTIME: 'Airtime', DATA: 'Data', ELECTRICITY: 'Electricity', CABLE: 'Cable TV', EDUCATION: 'Exam PINs', INTERNET: 'Internet', BETTING: 'Betting' };

function MaintenanceBanner({ info, service, generalOnly }) {
  const m = info?.maintenance;
  if (!m) return null;
  let text = null;
  if (m.all) text = m.message;
  else if (generalOnly && m.services?.length) text = `${m.services.map((x) => PAUSE_LABEL[x] || x).join(', ')} ${m.services.length === 1 ? 'is' : 'are'} paused for a short while. ${m.message && !/paused for a short while/.test(m.message) ? m.message : 'Everything else works as normal.'}`;
  else if (service && m.services?.includes(service)) text = m.message;
  if (!text) return null;
  return (
    <div role="status" className="card" style={{ margin: '0 16px 12px', padding: '10px 12px', fontSize: 14, display: 'flex', gap: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444' }}>
      <span aria-hidden="true">🛠️</span>
      <span>{text}</span>
    </div>
  );
}

export default function ServiceNotices({ service, generalOnly }) {
  const info = useAppInfo();
  const notices = (info?.notices || []).filter((n) => (generalOnly ? !n.service : !n.service || n.service === service));
  const banner = <MaintenanceBanner info={info} service={service} generalOnly={generalOnly} key="maintenance" />;
  if (!notices.length) return banner;
  return [banner, ...notices.map((n) => (
    <div
      key={n.id}
      className="card"
      style={{
        margin: '0 16px 12px',
        padding: '10px 12px',
        fontSize: 14,
        display: 'flex',
        gap: 8,
        background: n.level === 'WARNING' ? 'rgba(249,115,22,0.12)' : 'rgba(59,130,246,0.12)',
        border: `1px solid ${n.level === 'WARNING' ? 'var(--orange, #f97316)' : '#3b82f6'}`,
      }}
    >
      <span aria-hidden="true">{n.level === 'WARNING' ? '⚠️' : 'ℹ️'}</span>
      <span>{n.message}</span>
    </div>
  ))];
}
