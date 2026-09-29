import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api';
import PasswordField from '../components/PasswordField';
import NewPasswordFields from '../components/NewPasswordFields';
import { passwordIsStrong } from '../lib/passwordRules';

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
    if (!passwordIsStrong(newPassword)) {
      setError('Your password needs a capital letter, a small letter, a number and a special character, and at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res?.token) localStorage.setItem('zappipay_customer_token', res.token);
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
        <NewPasswordFields password={newPassword} setPassword={setNewPassword} confirm={confirmPassword} setConfirm={setConfirmPassword} label="New password" />
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
