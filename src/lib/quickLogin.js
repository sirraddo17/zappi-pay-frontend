import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';

// What this browser remembers when quick login is on. The deviceToken
// is the secret that ties PIN / fingerprint login to this device; the
// rest is just so the login screen can greet the person by name.
const KEY = 'zappipay_quick_login';
const UNLOCKED_KEY = 'zappipay_unlocked';

export function getQuickLogin() {
  try {
    const q = JSON.parse(localStorage.getItem(KEY) || 'null');
    return q && q.deviceToken ? q : null;
  } catch {
    return null;
  }
}

export function saveQuickLogin(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...(getQuickLogin() || {}), ...data }));
  } catch {
    // storage blocked — quick login just won't be remembered
  }
}

export function clearQuickLogin() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// "Unlocked" lasts for this app session only (cleared when the app or
// tab is closed), so reopening the app asks for PIN / fingerprint.
export function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, '1');
  } catch {
    // ignore
  }
}

export function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === '1';
  } catch {
    return true;
  }
}

export function clearUnlocked() {
  try {
    sessionStorage.removeItem(UNLOCKED_KEY);
  } catch {
    // ignore
  }
}

export async function biometricAvailable() {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

export function deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Windows/.test(ua)) return 'Windows computer';
  if (/Mac/.test(ua)) return 'Mac';
  return 'This device';
}

export function runBiometricPrompt(options) {
  return startAuthentication({ optionsJSON: options });
}

export function runBiometricSetup(options) {
  return startRegistration({ optionsJSON: options });
}

// Turns browser WebAuthn errors into something a customer understands.
export function biometricErrorMessage(err) {
  if (err?.name === 'NotAllowedError') return 'Fingerprint / Face ID was cancelled or timed out.';
  if (err?.name === 'InvalidStateError') return 'Fingerprint / Face ID is already set up on this device.';
  if (err?.name === 'UnknownError' || /credential manager/i.test(err?.message || '')) {
    return "Your phone couldn't save the fingerprint. Make sure a screen lock and fingerprint are set up in your phone settings, update Chrome and Google Play services, then try again. You can keep using your PIN.";
  }
  return err?.message || 'Fingerprint / Face ID did not work. Please use your PIN.';
}
