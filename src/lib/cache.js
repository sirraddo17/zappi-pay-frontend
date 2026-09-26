// Small "show the last known data instantly, refresh in the background"
// cache kept in this browser only. Everything is wrapped in try/catch
// because storage can be full, blocked or cleared at any time; the app
// then simply waits for the network as before.

const PREFIX = 'zp_cache:';

export function readCache(key, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > maxAgeMs) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Storage full or blocked — not important.
  }
}

// Removes every cached item (used on logout so the next person on this
// phone never sees the previous customer's data).
export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// Calls onData with the cached value right away (if any), then fetches
// fresh data, caches it and calls onData again. Returns the fetch
// promise so callers can still catch network errors.
export function cached(key, fetcher, onData, maxAgeMs) {
  const hit = readCache(key, maxAgeMs);
  if (hit !== undefined) onData(hit, true);
  return fetcher().then((fresh) => {
    // Don't store anything once the customer has been logged out.
    let loggedIn = true;
    try { loggedIn = Boolean(localStorage.getItem('zappipay_customer_token')); } catch { /* ignore */ }
    if (loggedIn) writeCache(key, fresh);
    onData(fresh, false);
    return fresh;
  });
}
