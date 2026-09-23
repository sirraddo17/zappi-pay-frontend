import { useEffect, useState } from 'react';
import PasswordField from '../components/PasswordField';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import PinPad, { FingerprintIcon } from '../components/PinPad';
import { quickLoginPin, quickLoginBiometricOptions, quickLoginBiometric } from '../api';
import { getQuickLogin, clearQuickLogin, saveQuickLogin, runBiometricPrompt, biometricErrorMessage } from '../lib/quickLogin';

function QuickLogin({ quick, onUsePassword, onSwitchAccount }) {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const firstName = (quick.name || '').split(' ')[0] || 'there';

  function handleFailure(err) {
    if (err.code === 'DEVICE_UNKNOWN') {
      clearQuickLogin();
      onUsePassword(err.message);
      return;
    }
    if (err.code === 'PASSWORD_REQUIRED' || err.code === 'PIN_LOCKED') {
      onUsePassword(err.message);
      return;
    }
    setError(err.message || 'Could not log in.');
    setResetKey((k) => k + 1);
  }

  async function withPin(pin) {
    setBusy(true);
    setError('');
    try {
      const data = await quickLoginPin({ deviceToken: quick.deviceToken, pin });
      startSession(data);
      navigate('/', { replace: true });
    } catch (err) {
      handleFailure(err);
    } finally {
      setBusy(false);
    }
  }

  async function withBiometric() {
    setBusy(true);
    setError('');
    try {
      const { options } = await quickLoginBiometricOptions({ deviceToken: quick.deviceToken });
      let response;
      try {
        response = await runBiometricPrompt(options);
      } catch (err) {
        setError(biometricErrorMessage(err));
        return;
      }
      const data = await quickLoginBiometric({ deviceToken: quick.deviceToken, response });
      startSession(data);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 'NO_BIOMETRIC') saveQuickLogin({ biometric: false });
      handleFailure(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0 8px' }}>
        {quick.avatarUrl ? (
          <img src={quick.avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--purple)' }} />
        ) : (
          <Logo iconSize={56} wordmarkSize={26} />
        )}
      </div>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>Welcome back, {firstName}</h1>
        <p>{quick.biometric ? 'Enter your PIN or use fingerprint / Face ID' : 'Enter your 4-digit PIN'}</p>
      </div>

      {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}

      <div style={{ padding: '8px 16px' }}>
        <PinPad
          resetKey={resetKey}
          disabled={busy}
          onComplete={withPin}
          extraKey={
            quick.biometric ? (
              <button
                type="button"
                onClick={withBiometric}
                disabled={busy}
                aria-label="Log in with fingerprint or Face ID"
                style={{ height: 58, borderRadius: 14, border: '1px solid var(--purple)', background: 'rgba(134,59,255,0.15)', color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <FingerprintIcon />
              </button>
            ) : null
          }
        />
      </div>
      {busy && <p style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: 14 }}>Logging in…</p>}

      <p style={{ textAlign: 'center', fontSize: 14, marginTop: 20 }}>
        <button type="button" onClick={() => onUsePassword('')} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 14 }}>
          Use password instead
        </button>
      </p>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--slate-400)' }}>
        Not {firstName}?{' '}
        <button type="button" onClick={onSwitchAccount} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
          Switch account
        </button>
      </p>
    </div>
  );
}

export default function Login() {
  const { login, customer } = useAuth();
  const navigate = useNavigate();

  const [quick, setQuick] = useState(getQuickLogin);
  const [usePassword, setUsePassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) navigate('/', { replace: true });
  }, [customer]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  }

  if (quick && !usePassword) {
    return (
      <QuickLogin
        quick={quick}
        onUsePassword={(msg) => {
          setError(msg || '');
          setUsePassword(true);
          setQuick(getQuickLogin());
        }}
        onSwitchAccount={() => {
          clearQuickLogin();
          setQuick(null);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0 8px' }}>
        <Link to="/welcome" aria-label="ZAPPI PAY home" style={{ textDecoration: 'none' }}>
          <Logo iconSize={56} wordmarkSize={26} />
        </Link>
      </div>
      <div className="page-header">
        <h1>Welcome back</h1>
        <p>Log in to ZAPPI PAY</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="identifier">Phone number or username</label>
          <input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
        <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 14 }}>
          <Link to="/forgot-password" style={{ color: 'var(--slate-400)' }}>Forgot password?</Link>
        </p>
      </form>

      {quick && (
        <p style={{ textAlign: 'center', fontSize: 14 }}>
          <button type="button" onClick={() => { setUsePassword(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 14 }}>
            Use PIN{quick.biometric ? ' or fingerprint' : ''} instead
          </button>
        </p>
      )}

      <p style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: 14 }}>
        No account? <Link to="/signup" style={{ color: 'var(--orange)' }}>Sign up</Link>
      </p>
    </div>
  );
}
