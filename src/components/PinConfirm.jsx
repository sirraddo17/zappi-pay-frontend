import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setPin, biometricTxOptions } from '../api';
import PinPad, { FingerprintIcon } from './PinPad';
import PasswordField from './PasswordField';
import { getQuickLogin, runBiometricPrompt, biometricErrorMessage } from '../lib/quickLogin';

const PIN_CODES = ['PIN_WRONG', 'PIN_LOCKED', 'PIN_REQUIRED', 'BIOMETRIC_FAILED'];

// Bottom-sheet that confirms a payment with the customer's PIN or
// fingerprint / Face ID. `onSubmit(auth)` does the real API call with
// auth = { pin } or { webauthn }; PIN problems are shown here, any
// other error goes to `onError` and the sheet closes. Customers who
// have never made a PIN are walked through creating one first.
export default function PinConfirm({ open, title = 'Confirm payment', summary, notice, onSubmit, onError, onClose }) {
  const { customer, refreshCustomer } = useAuth();
  const [mode, setMode] = useState('pin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const quick = getQuickLogin();
  const canBiometric = Boolean(quick?.biometric);

  useEffect(() => {
    if (open) {
      setMode(customer?.hasPin ? 'pin' : 'setup-password');
      setError('');
      setBusy(false);
      setPassword('');
      setNewPin('');
      setResetKey((k) => k + 1);
    }
  }, [open]);

  if (!open) return null;

  async function submit(auth) {
    setBusy(true);
    setError('');
    try {
      await onSubmit(auth);
    } catch (err) {
      if (err.code === 'PIN_NOT_SET') {
        setMode('setup-password');
      } else if (PIN_CODES.includes(err.code)) {
        setError(err.message);
        setResetKey((k) => k + 1);
      } else {
        onError?.(err);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  async function useBiometric() {
    setError('');
    setBusy(true);
    try {
      const { options } = await biometricTxOptions();
      const webauthn = await runBiometricPrompt(options);
      setBusy(false);
      await submit({ webauthn });
    } catch (err) {
      setBusy(false);
      setError(biometricErrorMessage(err));
    }
  }

  async function finishSetup(confirmPin) {
    if (confirmPin !== newPin) {
      setError('The two PINs do not match. Try again.');
      setNewPin('');
      setMode('setup-new');
      setResetKey((k) => k + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setPin({ password, pin: newPin });
      await refreshCustomer();
      setBusy(false);
      setMode('pin');
      await submit({ pin: newPin });
    } catch (err) {
      setBusy(false);
      setError(err.message);
      if (/password/i.test(err.message)) setMode('setup-password');
      else {
        setNewPin('');
        setMode('setup-new');
      }
      setResetKey((k) => k + 1);
    }
  }

  const heading = {
    pin: title,
    'setup-password': 'Create your PIN',
    'setup-new': 'Choose a 4-digit PIN',
    'setup-confirm': 'Confirm your PIN',
  }[mode];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--slate-900)',
          borderTop: '2px solid var(--purple)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 16px 28px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{heading}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 24, cursor: 'pointer' }}>
            ×
          </button>
        </div>
        {summary && mode === 'pin' && <p style={{ margin: '0 0 12px', color: 'var(--slate-400)', fontSize: 14 }}>{summary}</p>}
        {notice && <div style={{ margin: '0 0 12px' }}>{notice}</div>}

        {mode === 'setup-password' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              setMode('setup-new');
              setResetKey((k) => k + 1);
            }}
          >
            <p style={{ margin: '0 0 12px', color: 'var(--slate-400)', fontSize: 14 }}>
              You'll use a 4-digit PIN to confirm every payment. Enter your account password to create one.
            </p>
            <div className="field">
              <label htmlFor="pin-password">Password</label>
              <PasswordField id="pin-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error && <p className="error-text" style={{ margin: '0 0 10px' }}>{error}</p>}
            <button className="btn" type="submit" disabled={!password}>
              Continue
            </button>
          </form>
        )}

        {mode === 'setup-new' && (
          <>
            <p style={{ margin: '0 0 8px', color: 'var(--slate-400)', fontSize: 14, textAlign: 'center' }}>Avoid easy PINs like 1234 or 0000.</p>
            {error && <p className="error-text" style={{ textAlign: 'center', margin: '0 0 8px' }}>{error}</p>}
            <PinPad
              resetKey={resetKey}
              onComplete={(p) => {
                setNewPin(p);
                setError('');
                setMode('setup-confirm');
                setResetKey((k) => k + 1);
              }}
            />
          </>
        )}

        {mode === 'setup-confirm' && (
          <>
            <p style={{ margin: '0 0 8px', color: 'var(--slate-400)', fontSize: 14, textAlign: 'center' }}>Enter the same PIN again.</p>
            {error && <p className="error-text" style={{ textAlign: 'center', margin: '0 0 8px' }}>{error}</p>}
            <PinPad resetKey={resetKey} disabled={busy} onComplete={finishSetup} />
            {busy && <p style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: 14 }}>Saving…</p>}
          </>
        )}

        {mode === 'pin' && (
          <>
            {error && <p className="error-text" style={{ textAlign: 'center', margin: '0 0 8px' }}>{error}</p>}
            <PinPad
              resetKey={resetKey}
              disabled={busy}
              onComplete={(pin) => submit({ pin })}
              extraKey={
                canBiometric ? (
                  <button
                    type="button"
                    onClick={useBiometric}
                    disabled={busy}
                    aria-label="Use fingerprint or Face ID"
                    style={{ height: 58, borderRadius: 14, border: '1px solid var(--purple)', background: 'rgba(134,59,255,0.15)', color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FingerprintIcon />
                  </button>
                ) : null
              }
            />
            <p style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: 13, margin: '14px 0 0' }}>
              {busy ? 'Processing…' : (
                <>Forgot your PIN? <Link to="/security" style={{ color: 'var(--purple)' }}>Reset it</Link> with your password.</>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
