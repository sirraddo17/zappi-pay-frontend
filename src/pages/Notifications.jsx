import { useEffect, useState } from 'react';
import { useShowMore } from '../components/ShowMore';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getReminders, setRemindersOff } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import { BellIcon } from '../components/Icons';
import BottomNav from '../components/BottomNav';

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
  const listPage = useShowMore(notifications, [], 10);
  const [error, setError] = useState('');

  function load() {
    getNotifications()
      .then((data) => setNotifications(data.notifications))
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

      <RenewalReminderToggle />

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
          <p className="empty-state">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="empty-state">No notifications yet.</p>
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
              {!n.read && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', marginTop: 6, flexShrink: 0 }} />
              )}
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
