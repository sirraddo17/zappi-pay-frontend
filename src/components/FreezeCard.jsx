import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { freezeMyAccount } from '../api';
import { useAuth } from '../context/AuthContext';
import PasswordField from './PasswordField';

// Security → "Freeze my account": for a lost/stolen phone or a hacked
// account. Logs out every device, removes quick login and blocks all
// logins and payments until support confirms it's really them.
export default function FreezeCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function freeze(e) {
    e.preventDefault();
    if (!window.confirm('Freeze your account now? You will be logged out everywhere and only support can unfreeze it.')) return;
    setBusy(true);
    setError('');
    try {
      await freezeMyAccount(password);
      try { sessionStorage.setItem('zappipay_idle_customer', 'Your account is frozen. Nobody can log in or spend from it. Contact support to unfreeze it — we will confirm it is really you first.'); } catch { /* ignore */ }
      await Promise.resolve(logout?.()).catch(() => {});
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not freeze the account. Call or WhatsApp support now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ border: '1px solid var(--red-500)' }}>
      <div style={{ fontWeight: 600 }}>🧊 Freeze my account</div>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>
        Lost your phone, or think someone got into your account? Freezing logs you out on every device, turns off quick login and blocks all logins and payments. Your money stays safe in your wallet. To unfreeze, contact support — we confirm it’s really you first.
      </p>
      {!open ? (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10, color: 'var(--red-500)', borderColor: 'var(--red-500)' }} onClick={() => setOpen(true)}>Freeze my account</button>
      ) : (
        <form onSubmit={freeze} style={{ marginTop: 10 }}>
          <div className="field">
            <label htmlFor="freezePw">Your password</label>
            <PasswordField id="freezePw" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn" style={{ background: 'var(--red-500)' }} disabled={busy || !password}>{busy ? 'Freezing…' : 'Freeze now'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setPassword(''); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
