import { useSyncExternalStore } from 'react';

// Lite / data-saver mode: no ads or promo banners, no animations and
// slower background refreshes, for slow or expensive connections. The
// choice is saved on this phone; index.html applies it before the app
// draws.
const KEY = 'zappipay_lite';
const ASKED = 'zappipay_lite_asked';
const listeners = new Set();

function read() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
let on = read();

export function isLite() {
  return on;
}

export function setLite(value) {
  on = Boolean(value);
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
    localStorage.setItem(ASKED, '1');
  } catch { /* private mode */ }
  if (on) document.documentElement.setAttribute('data-lite', '');
  else document.documentElement.removeAttribute('data-lite');
  listeners.forEach((fn) => fn());
}

export function useLite() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => on, () => false);
}

// The phone says data saver is on, or the connection is 2G.
export function slowConnection() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || ['slow-2g', '2g'].includes(c.effectiveType)));
}

export function shouldSuggestLite() {
  if (on) return false;
  try {
    if (localStorage.getItem(ASKED) === '1') return false;
  } catch { return false; }
  return slowConnection();
}

export function dismissLiteSuggestion() {
  try {
    localStorage.setItem(ASKED, '1');
  } catch { /* ignore */ }
}
