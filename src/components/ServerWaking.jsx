import { useEffect, useState } from 'react';

// Small banner shown while a request to the backend is taking a while —
// usually because the free server was asleep and is starting up.
export default function ServerWaking() {
  const [slow, setSlow] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const onSlow = (e) => setSlow(e.detail);
    window.addEventListener('zp-server-slow', onSlow);
    return () => window.removeEventListener('zp-server-slow', onSlow);
  }, []);

  useEffect(() => {
    if (slow <= 0) {
      setSeconds(0);
      return undefined;
    }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [slow > 0]);

  if (slow <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        width: 'min(440px, calc(100vw - 24px))',
        background: 'var(--slate-800)',
        border: '1px solid var(--purple)',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 13,
        color: 'var(--slate-100)',
      }}
    >
      <span className="zp-spinner" aria-hidden="true" />
      <span>
        <b style={{ display: 'block' }}>Connecting to ZappiPay…</b>
        <span style={{ color: 'var(--slate-400)' }}>
          {seconds < 20 ? 'This can take a few seconds.' : 'Our server is waking up — this can take up to a minute. Please keep this page open.'}
        </span>
      </span>
    </div>
  );
}
