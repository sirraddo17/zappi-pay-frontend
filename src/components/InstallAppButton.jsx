import { useEffect, useState } from 'react';

// Chrome/Edge fire "beforeinstallprompt" when the page's manifest is
// installable; we keep it so a button can open the install dialog.
// (On /admin pages the manifest is the separate "ZP Admin" app.)
let deferred = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallAppButton({ label = 'Install app', className = 'btn-secondary btn', style }) {
  const [, force] = useState(0);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  if (isStandalone()) return null;

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);

  async function install() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      force((n) => n + 1);
      return;
    }
    setHint(
      isIos
        ? 'In Safari, tap the Share button, then "Add to Home Screen".'
        : 'Open your browser menu (⋮) and tap "Install app" or "Add to Home screen".'
    );
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" className={className} style={style} onClick={install}>
        📲 {label}
      </button>
      {hint && <span style={{ fontSize: 12, color: 'var(--slate-400)', maxWidth: 240 }}>{hint}</span>}
    </span>
  );
}
