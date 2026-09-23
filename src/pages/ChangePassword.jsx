import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api';
import PasswordField from '../components/PasswordField';

// Shown instead of every other page while customer.mustChangePassword
// is true — i.e. after support issued a temporary password. The
// customer can't use the app until they pick their own password.
export default function ChangePassword() {
  const { customer, refreshCustomer, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      await refreshCustomer();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Create a new password</h1>
        <p>
          Hi {customer?.name?.split(' ')[0] || 'there'}, you logged in with a temporary password from support. Choose your own password to
          continue.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="currentPassword">Temporary password</label>
          <PasswordField id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
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

      <p style={{ textAlign: 'center', fontSize: 14 }}>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Log out
        </button>
      </p>
    </div>
  );
}
