import { useEffect, useRef } from 'react';

// Keeps a screen up to date without the customer pulling to refresh:
// - while `active` (e.g. an order is still pending) it reloads every
//   4 seconds for the first 2 minutes, then every 15 seconds, and gives
//   up after 15 minutes;
// - it always reloads when the app comes back to the front, and when a
//   push notification arrives (see public/push-sw.js).
export default function useAutoRefresh(reload, active) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    const run = () => reloadRef.current();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    const onMessage = (e) => { if (e.data?.type === 'zp-push') run(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('zp-refresh', run);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('zp-refresh', run);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const started = Date.now();
    let timer;
    const tick = () => {
      const age = Date.now() - started;
      if (age > 15 * 60 * 1000) return;
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') reloadRef.current();
        tick();
      }, age < 2 * 60 * 1000 ? 4000 : 15000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [active]);
}
