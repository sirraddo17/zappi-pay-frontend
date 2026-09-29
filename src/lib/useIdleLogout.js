import { useEffect, useRef } from 'react';

// Logs out after a period with no taps, clicks or typing — like bank
// apps do, so an unlocked phone left on a table doesn't give access to
// the wallet. The last activity time is saved, so closing the app and
// coming back later also asks to log in again.
const THROTTLE_MS = 15 * 1000;

function read(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function write(key, v) {
  try {
    localStorage.setItem(key, String(v));
  } catch { /* private mode */ }
}

export function idleMessage(kind) {
  try {
    const m = sessionStorage.getItem(`zappipay_idle_${kind}`);
    if (m) sessionStorage.removeItem(`zappipay_idle_${kind}`);
    return m;
  } catch {
    return null;
  }
}

export default function useIdleLogout({ active, minutes, kind, onTimeout }) {
  const cb = useRef(onTimeout);
  cb.current = onTimeout;
  useEffect(() => {
    if (!active) return undefined;
    const key = `zappipay_last_active_${kind}`;
    const limit = minutes * 60 * 1000;
    let lastWrite = 0;

    function timeout() {
      try {
        sessionStorage.setItem(`zappipay_idle_${kind}`, `For your safety you were logged out after ${minutes} minutes without activity.`);
      } catch { /* ignore */ }
      write(key, 0);
      cb.current();
    }
    function check() {
      const last = read(key);
      if (last && Date.now() - last > limit) timeout();
    }
    function activity() {
      const now = Date.now();
      if (now - lastWrite < THROTTLE_MS) return;
      lastWrite = now;
      write(key, now);
    }

    // Coming back to the app after a long time away.
    check();
    if (!read(key)) activity();

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 30 * 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, activity));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [active, minutes, kind]);
}
