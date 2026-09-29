// Light / dark mode. The choice is saved on this device; index.html
// applies it before the app loads so there's no flash.
const KEY = 'zappipay_theme';

export function getThemeChoice() {
  try {
    return localStorage.getItem(KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(choice) {
  let t = choice;
  if (t === 'system') t = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
}

export function setThemeChoice(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch { /* private mode */ }
  applyTheme(choice);
}

// Follow the phone's setting live when "system" is chosen.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (getThemeChoice() === 'system') applyTheme('system');
  });
}
