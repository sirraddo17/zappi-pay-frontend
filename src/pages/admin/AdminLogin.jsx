import { useState } from 'react';
import { idleMessage } from '../../lib/useIdleLogout';
import PasswordField from '../../components/PasswordField';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import InstallAppButton from '../../components/InstallAppButton';

export default function AdminLogin() {
  const { login, verifyCode } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [idle] = useState(() => idleMessage('admin') || (new URLSearchParams(window.location.search).get('expired') ? 'Your admin session ended (12 hours). Please log in again.' : ''));
  const [useBackup, setUseBackup] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyCode(challenge.challengeId, code, remember);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Could not verify the code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const step = await login(email.trim(), password);
      if (step?.twoFactor) {
        setChallenge(step);
        setCode('');
        setUseBackup(Boolean(step.emailFailed));
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>ZAPPI PAY Admin</h1>
        <p>Log in to the admin panel</p>
      </div>

      {idle && <p style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(134,59,255,0.12)', border: '1px solid var(--purple)' }}>🔒 {idle}</p>}
      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {challenge ? (
        <form className="card" style={{ margin: 0 }} onSubmit={handleVerify}>
          {challenge.emailFailed ? (
            <p style={{ marginTop: 0, fontSize: 14, color: 'var(--gold)' }}>
              We couldn’t send the login email right now. Enter one of your <strong>backup codes</strong> instead.
            </p>
          ) : (
            <p style={{ marginTop: 0, fontSize: 14 }}>
              {useBackup ? 'Enter one of your backup codes (e.g. K7QM-3XPD).' : <>We emailed a 6-digit code to <strong>{challenge.emailHint}</strong>. Enter it to finish logging in.</>}
            </p>
          )}
          <div className="field">
            <label htmlFor="code">{useBackup ? 'Backup code' : 'Login code'}</label>
            {useBackup ? (
              <input id="code" autoComplete="off" autoCapitalize="characters" maxLength={9} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} required autoFocus style={{ letterSpacing: 2 }} />
            ) : (
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
            )}
          </div>
          {!challenge.emailFailed && challenge.backupCodes > 0 && (
            <button type="button" onClick={() => { setUseBackup((x) => !x); setCode(''); }} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, margin: '0 0 10px', fontSize: 13 }}>
              {useBackup ? 'Use the email code instead' : 'Didn’t get the email? Use a backup code'}
            </button>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 12 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} />
            Trust this device for 30 days
          </label>
          <button className="btn" type="submit" disabled={submitting || (useBackup ? code.replace(/-/g, '').length !== 8 : code.length !== 6)}>
            {submitting ? 'Checking…' : 'Verify & log in'}
          </button>
          <button type="button" onClick={() => { setChallenge(null); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', marginTop: 10, width: '100%' }}>
            Back
          </button>
        </form>
      ) : (
      <form className="card" style={{ margin: 0 }} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>
      )}

      <div style={{ textAlign: 'center', margin: '8px 16px 24px' }}>
        <InstallAppButton admin label="Install ZP Admin on this phone" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} />
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '8px 0 0' }}>
          Adds a separate admin app to your home screen that opens straight here.
        </p>
      </div>
    </div>
  );
}
