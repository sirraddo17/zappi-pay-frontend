// Remembers the agent shop a customer arrived from (/shop/<username>)
// for 30 days, so their purchases earn that agent a commission.
const KEY = 'zappipay_shop';
const DAYS = 30;

export function rememberShop(username, name) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ username, name, until: Date.now() + DAYS * 86400000 }));
  } catch { /* private mode */ }
}

export function currentShop() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!v || !v.username || !(v.until > Date.now())) return null;
    return v;
  } catch {
    return null;
  }
}

export function forgetShop() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
