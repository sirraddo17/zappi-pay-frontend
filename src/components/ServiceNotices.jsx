import { useEffect, useState } from 'react';
import { getAppInfo } from '../api';

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

export default function ServiceNotices({ service, generalOnly }) {
  const info = useAppInfo();
  const notices = (info?.notices || []).filter((n) => (generalOnly ? !n.service : !n.service || n.service === service));
  if (!notices.length) return null;
  return notices.map((n) => (
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
  ));
}
