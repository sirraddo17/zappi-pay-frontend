import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { useShowMore } from '../components/ShowMore';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getReminders, setRemindersOff } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import { BellIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';

// Tabs, like a bank app: money, your account, and news/offers.
const TABS = [
  { key: 'TRANSACTION', label: 'Transactions', icon: '💸' },
  { key: 'ACCOUNT', label: 'Account', icon: '🔐' },
  { key: 'UPDATE', label: 'Updates', icon: '📣' },
];

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// "Remind me before my DStv / data plan runs out" on/off.
function RenewalReminderToggle() {
  const [off, setOff] = useState(null);
  useEffect(() => {
    getReminders().then((d) => setOff(Boolean(d.off))).catch(() => {});
  }, []);
  if (off === null) return null;
  async function flip() {
    const next = !off;
    setOff(next);
    try {
      await setRemindersOff(next);
    } catch {
      setOff(!next);
    }
  }
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 16px 0', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--slate-700)', background: 'var(--slate-800)', cursor: 'pointer' }}>
      <span style={{ flex: 1 }}>
        <b style={{ display: 'block', fontSize: 14 }}>Renewal reminders</b>
        <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Tell me before my DStv, GOtv, Startimes or data plan runs out</span>
      </span>
      <input type="checkbox" checked={!off} onChange={flip} style={{ width: 20, height: 20, accentColor: 'var(--purple)' }} />
    </label>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState(null);
  const [tab, setTab] = useState(null);
  const shown = notifications ? notifications.filter((n) => (n.category || 'UPDATE') === (tab || 'TRANSACTION')) : null;
  const listPage = useShowMore(shown, [tab], 10);
  const [error, setError] = useState('');

  function load() {
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        // Open on the tab with the newest unread message.
        setTab((t) => t || (data.notifications.find((n) => !n.read)?.category) || 'TRANSACTION');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);
  useAutoRefresh(load, false);

  async function handleOpen(n) {
    if (n.read) return;
    setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(n.id);
    } catch {
      load();
    }
  }

  async function handleMarkAllRead() {
    setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  }

  const hasUnread = notifications?.some((n) => !n.read);

  return (
    <div className="app-shell">
      <div className="dash-header" style={{ paddingBottom: 20 }}>
        <div className="dash-header-top">
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 20 }}>&larr;</Link>
          <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>Notifications</h1>
          <BellIcon size={20} color="#fff" />
        </div>
      </div>

      {error && <p className="error-text" style={{ margin: '16px 16px 0' }}>{error}</p>}

      <div role="tablist" style={{ display: 'flex', gap: 8, margin: '16px 16px 0', overflowX: 'auto' }}>
        {TABS.map((t) => {
          const unread = notifications ? notifications.filter((n) => n.category === t.key && !n.read).length : 0;
          const on = (tab || 'TRANSACTION') === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              style={{ position: 'relative', flex: '1 0 auto', padding: '9px 14px', borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${on ? 'var(--purple)' : 'var(--slate-700)'}`, background: on ? 'rgba(134,59,255,0.22)' : 'var(--slate-800)', color: on ? '#fff' : 'var(--slate-300, #cbd5e1)' }}
            >
              {t.label}
              {unread > 0 && <span style={{ marginLeft: 6, minWidth: 18, padding: '0 5px', height: 18, lineHeight: '18px', display: 'inline-block', borderRadius: 9, background: 'var(--red-500, #ef4444)', color: '#fff', fontSize: 11, fontWeight: 700 }}>{unread > 99 ? '99+' : unread}</span>}
            </button>
          );
        })}
      </div>

      {(tab || 'TRANSACTION') === 'UPDATE' && <RenewalReminderToggle />}

      {hasUnread && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 16px 0' }}>
          <button
            type="button"
            className="btn-secondary btn"
            style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </button>
        </div>
      )}

      <div className="tx-list" style={{ margin: '16px 16px 90px' }}>
        {notifications === null ? (
          <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>
        ) : shown.length === 0 ? (
          <p className="empty-state">{notifications.length === 0 ? 'No notifications yet.' : `No ${TABS.find((t) => t.key === (tab || 'TRANSACTION')).label.toLowerCase()} notifications yet.`}</p>
        ) : (
          listPage.visible.map((n) => (
            <div
              key={n.id}
              onClick={() => handleOpen(n)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: n.read ? 'default' : 'pointer',
                background: n.read ? 'transparent' : 'rgba(134,59,255,0.08)',
              }}
            >
              <span aria-hidden="true" style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'rgba(134,59,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                {TABS.find((t) => t.key === n.category)?.icon || '🔔'}
                {!n.read && <span style={{ position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--red-500, #ef4444)', border: '2px solid var(--slate-900, #0f172a)' }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--slate-100)', fontSize: 14, fontWeight: 600 }}>{n.title}</div>
                <div style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 2 }}>{n.message}</div>
                <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>{fmtDate(n.createdAt)}</div>
              </div>
            </div>
          ))
        )}
        {listPage.more}
      </div>

      <BottomNav />
    </div>
  );
}
