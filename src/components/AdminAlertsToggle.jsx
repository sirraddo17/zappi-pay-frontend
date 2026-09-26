import { useEffect, useState } from 'react';
import { pushSupported, currentSubscription, enableAdminPush, disableAdminPush, isIosNotInstalled } from '../lib/push';
import { sendTestAdminAlert } from '../api';

// "Alerts on this device": push notifications to the admin app when a
// customer needs attention (support message, OTP needed, funding
// request...). `card` shows it as a prompt on the Overview page.
export default function AdminAlertsToggle({ card = false }) {
  const [on, setOn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    currentSubscription().then((s) => setOn(Boolean(s))).catch(() => setOn(false));
  }, []);

  if (!pushSupported() || on === null) return null;
  if (card && on) return null;

  async function toggle() {
    setBusy(true);
    setMsg('');
    try {
      if (on) {
        await disableAdminPush();
        setOn(false);
      } else {
        await enableAdminPush();
        setOn(true);
        const r = await sendTestAdminAlert().catch(() => null);
        setMsg(r ? `Alerts on ✅ Test sent (${r.pushSent} device${r.pushSent === 1 ? '' : 's'}${r.emailSent ? `, ${r.emailSent} email` : ''}).` : 'Alerts on ✅');
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (card) {
    return (
      <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--purple)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24 }}>🔔</span>
        <div style={{ flex: '1 1 220px' }}>
          <strong>Get alerts on this device</strong>
          <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '2px 0 0' }}>
            Be notified straight away about new support messages, transfers needing your OTP, funding requests and more.
            {isIosNotInstalled() && ' On iPhone, install the admin app to the Home Screen first.'}
          </p>
          {msg && <p style={{ fontSize: 13, margin: '6px 0 0', color: 'var(--slate-300, #cbd5e1)' }}>{msg}</p>}
        </div>
        <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy} onClick={toggle}>{busy ? 'Turning on…' : 'Turn on alerts'}</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" className="btn-secondary btn" style={{ fontSize: 13 }} disabled={busy} onClick={toggle}>
        {on ? '🔔 Alerts on — turn off' : '🔕 Turn on alerts'}
      </button>
      {msg && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>{msg}</div>}
    </div>
  );
}
