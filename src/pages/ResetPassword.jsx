import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';
import PasswordField from '../components/PasswordField';

// Opened from the link in the password-reset email
// (/reset-password?token=...).
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await resetPassword({ token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Choose a new password</h1>
        <p>Reset your ZAPPI PAY password</p>
      </div>

      {!token && (
        <div className="card">
          <p style={{ margin: '0 0 10px' }}>This reset link is incomplete. Please open the link from your email again, or request a new one.</p>
          <Link to="/forgot-password" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            Request a new link
          </Link>
        </div>
      )}

      {token && done && (
        <div className="card" style={{ border: '1px solid var(--green-500)' }}>
          <p style={{ margin: '0 0 12px' }}>Your password has been changed. You can now log in with it.</p>
          <button className="btn" type="button" onClick={() => navigate('/login', { replace: true })}>
            Go to Login
          </button>
        </div>
      )}

      {token && !done && (
        <>
          {error && (
            <p className="error-text">
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link to="/forgot-password" style={{ color: 'var(--orange)' }}>Request a new link</Link>
              )}
            </p>
          )}
          <form className="card" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <PasswordField id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <PasswordField id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save New Password'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
