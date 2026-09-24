import { useState } from 'react';
import PasswordField from '../../components/PasswordField';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import InstallAppButton from '../../components/InstallAppButton';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/admin');
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

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

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

      <div style={{ textAlign: 'center', margin: '8px 16px 24px' }}>
        <InstallAppButton admin label="Install ZP Admin on this phone" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} />
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '8px 0 0' }}>
          Adds a separate admin app to your home screen that opens straight here.
        </p>
      </div>
    </div>
  );
}
