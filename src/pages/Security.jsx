import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSecurityStatus,
  setPin,
  trustThisDevice,
  untrustThisDevice,
  untrustOtherDevices,
  biometricRegisterOptions,
  biometricRegisterVerify,
  removeBiometric,
} from '../api';
import PinPad from '../components/PinPad';
import PasswordField from '../components/PasswordField';
import BottomNav from '../components/BottomNav';
import {
  getQuickLogin,
  saveQuickLogin,
  clearQuickLogin,
  biometricAvailable,
  deviceLabel,
  runBiometricSetup,
  biometricErrorMessage,
  markUnlocked,
} from '../lib/quickLogin';

function Toggle({ on, onClick, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 50,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--purple)' : 'var(--slate-700)',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  );
}

export default function Security() {
  const { customer, refreshCustomer } = useAuth();
  const [status, setStatus] = useState(null);
  const [hasBiometricHw, setHasBiometricHw] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // PIN create/change flow
  const [pinStep, setPinStep] = useState(null); // null | 'password' | 'new' | 'confirm'
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [padKey, setPadKey] = useState(0);

  // Asking for the PIN to turn quick login on
  const [askPinForDevice, setAskPinForDevice] = useState(false);

  function load() {
    getSecurityStatus()
      .then((s) => {
        setStatus(s);
        // Keep this browser's saved flags in line with the server.
        if (!s.quickLoginOnThisDevice && getQuickLogin()) clearQuickLogin();
        if (s.quickLoginOnThisDevice) saveQuickLogin({ biometric: s.biometricOnThisDevice });
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    biometricAvailable().then(setHasBiometricHw);
  }, []);

  function flash(msg) {
    setMessage(msg);
    setError('');
  }

  async function savePin(confirmPin) {
    if (confirmPin !== newPin) {
      setError('The two PINs do not match. Try again.');
      setNewPin('');
      setPinStep('new');
      setPadKey((k) => k + 1);
      return;
    }
    setBusy(true);
    try {
      await setPin({ password, pin: newPin });
      await refreshCustomer();
      setPinStep(null);
      setPassword('');
      setNewPin('');
      flash(status?.hasPin ? 'Your PIN has been changed.' : 'Your PIN is set. You\'ll use it to confirm payments.');
      load();
    } catch (err) {
      setError(err.message);
      setPinStep(/password/i.test(err.message) ? 'password' : 'new');
      setNewPin('');
      setPadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  async function enableQuickLogin(pin) {
    setBusy(true);
    setError('');
    try {
      const { deviceToken } = await trustThisDevice({ pin, label: deviceLabel() });
      saveQuickLogin({ deviceToken, name: customer.name, avatarUrl: customer.avatarUrl || null, biometric: false });
      markUnlocked();
      setAskPinForDevice(false);
      flash('Quick login is on. Next time, just enter your PIN to log in on this device.');
      load();
    } catch (err) {
      setError(err.message);
      setPadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  async function disableQuickLogin() {
    setBusy(true);
    try {
      await untrustThisDevice();
      clearQuickLogin();
      flash('Quick login is off for this device.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function enableBiometric() {
    setBusy(true);
    setError('');
    try {
      const { options } = await biometricRegisterOptions();
      let response;
      try {
        response = await runBiometricSetup(options);
      } catch (err) {
        setError(biometricErrorMessage(err));
        return;
      }
      await biometricRegisterVerify(response);
      saveQuickLogin({ biometric: true });
      flash('Fingerprint / Face ID is on. You can use it to log in and confirm payments on this device.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disableBiometric() {
    setBusy(true);
    try {
      await removeBiometric();
      saveQuickLogin({ biometric: false });
      flash('Fingerprint / Face ID is off for this device.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOutOthers() {
    setBusy(true);
    try {
      await untrustOtherDevices();
      flash('Quick login has been turned off on all your other devices.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
  const sub = { color: 'var(--slate-400)', fontSize: 13, margin: '4px 0 0' };

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/profile" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to profile
        </Link>
        <h1>Security</h1>
        <p>PIN, quick login and fingerprint / Face ID</p>
      </div>

      {message && (
        <div className="card" style={{ border: '1px solid var(--green-500)', padding: '10px 14px' }}>
          <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      {!status ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <>
          <div className="card">
            <div style={row}>
              <div>
                <div style={{ fontWeight: 600 }}>Transaction PIN</div>
                <p style={sub}>
                  {status.hasPin ? 'Used to confirm every purchase and transfer.' : 'Not set yet — you\'ll need one to make payments.'}
                  {status.pinLocked && ' Locked after too many wrong tries — log in with your password to unlock it.'}
                </p>
              </div>
              {!pinStep && !askPinForDevice && (
                <button className="btn" type="button" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => { setPinStep('password'); setError(''); setMessage(''); }}>
                  {status.hasPin ? 'Change' : 'Create'}
                </button>
              )}
            </div>

            {pinStep === 'password' && (
              <form
                style={{ marginTop: 14 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setError('');
                  setPinStep('new');
                  setPadKey((k) => k + 1);
                }}
              >
                <div className="field">
                  <label htmlFor="sec-password">Your account password</label>
                  <PasswordField id="sec-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={!password}>Continue</button>
                  <button className="btn btn-secondary" type="button" onClick={() => { setPinStep(null); setPassword(''); }}>Cancel</button>
                </div>
              </form>
            )}
            {pinStep === 'new' && (
              <div style={{ marginTop: 14 }}>
                <p style={{ textAlign: 'center', margin: '0 0 6px', fontSize: 14 }}>Choose a new 4-digit PIN</p>
                <p style={{ ...sub, textAlign: 'center', margin: '0 0 6px' }}>Avoid easy PINs like 1234 or 0000.</p>
                <PinPad resetKey={padKey} onComplete={(p) => { setNewPin(p); setError(''); setPinStep('confirm'); setPadKey((k) => k + 1); }} />
              </div>
            )}
            {pinStep === 'confirm' && (
              <div style={{ marginTop: 14 }}>
                <p style={{ textAlign: 'center', margin: '0 0 6px', fontSize: 14 }}>Enter the same PIN again</p>
                <PinPad resetKey={padKey} disabled={busy} onComplete={savePin} />
              </div>
            )}
          </div>

          <div className="card">
            <div style={row}>
              <div>
                <div style={{ fontWeight: 600 }}>Quick login on this device</div>
                <p style={sub}>Log in with your PIN instead of your password. The app will ask for it each time you open it.</p>
              </div>
              <Toggle
                label="Quick login on this device"
                on={status.quickLoginOnThisDevice}
                disabled={busy || !status.hasPin || Boolean(pinStep)}
                onClick={() => {
                  setMessage('');
                  setError('');
                  if (status.quickLoginOnThisDevice) disableQuickLogin();
                  else {
                    setAskPinForDevice(true);
                    setPadKey((k) => k + 1);
                  }
                }}
              />
            </div>
            {!status.hasPin && <p style={sub}>Create your PIN first.</p>}
            {askPinForDevice && !status.quickLoginOnThisDevice && (
              <div style={{ marginTop: 14 }}>
                <p style={{ textAlign: 'center', margin: '0 0 6px', fontSize: 14 }}>Enter your PIN to turn on quick login</p>
                <PinPad resetKey={padKey} disabled={busy} onComplete={enableQuickLogin} />
                <p style={{ textAlign: 'center', marginTop: 10 }}>
                  <button type="button" onClick={() => setAskPinForDevice(false)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>Cancel</button>
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <div style={row}>
              <div>
                <div style={{ fontWeight: 600 }}>Fingerprint / Face ID</div>
                <p style={sub}>
                  {hasBiometricHw
                    ? 'Log in and confirm payments with your fingerprint or face on this device.'
                    : 'This device or browser doesn\'t support fingerprint / Face ID for websites. You can still use your PIN.'}
                </p>
              </div>
              <Toggle
                label="Fingerprint or Face ID"
                on={status.biometricOnThisDevice}
                disabled={busy || !hasBiometricHw || !status.quickLoginOnThisDevice}
                onClick={() => {
                  setMessage('');
                  setError('');
                  if (status.biometricOnThisDevice) disableBiometric();
                  else enableBiometric();
                }}
              />
            </div>
            {hasBiometricHw && !status.quickLoginOnThisDevice && <p style={sub}>Turn on quick login first.</p>}
          </div>

          {status.trustedDeviceCount > (status.quickLoginOnThisDevice ? 1 : 0) && (
            <div className="card">
              <div style={{ fontWeight: 600 }}>Other devices</div>
              <p style={sub}>
                Quick login is on for {status.trustedDeviceCount - (status.quickLoginOnThisDevice ? 1 : 0)} other device(s). Lost a phone? Turn it off there.
              </p>
              <button className="btn btn-secondary" type="button" style={{ marginTop: 10 }} disabled={busy} onClick={signOutOthers}>
                Turn off quick login on other devices
              </button>
            </div>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}
