import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { WHATSAPP_NUMBER } from '../assistant/knowledge';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSending(true);
    try {
      const data = await forgotPassword({ identifier: identifier.trim() });
      setMessage(data.message || 'If that account has an email address, a reset link is on its way.');
    } catch (err) {
      setError(err.message || 'Could not send reset link.');
    } finally {
      setSending(false);
    }
  }

  const waText = `Hello ZappiPay, I forgot my password. My phone number/username is ${identifier.trim() || '...'}`;

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/login" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to login
        </Link>
        <h1>Forgot password</h1>
        <p>We'll email you a link to reset it.</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && (
        <div className="card" style={{ border: '1px solid var(--green-500)' }}>
          <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="identifier">Phone number, username or email</label>
          <input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <div className="card">
        <p style={{ margin: '0 0 10px', fontSize: 14 }}>
          No email on your account, or no email arrived? Our support team can reset it for you and give you a temporary password.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
        >
          Contact support on WhatsApp
        </a>
      </div>
    </div>
  );
}
