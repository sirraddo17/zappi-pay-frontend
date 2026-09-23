import { useEffect, useState } from 'react';
import PasswordField from '../components/PasswordField';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReferralInfo } from '../api';

const REF_KEY = 'zappipay_ref';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  // ?ref= from an invite link wins; otherwise one remembered from an
  // earlier visit to the landing page with a link.
  const [referralCode, setReferralCode] = useState(() => {
    const fromUrl = searchParams.get('ref');
    if (fromUrl) return fromUrl;
    try {
      return localStorage.getItem(REF_KEY) || '';
    } catch {
      return '';
    }
  });
  const [referrer, setReferrer] = useState(null);

  useEffect(() => {
    const code = referralCode.trim().replace(/^@/, '');
    if (code.length < 3) {
      setReferrer(null);
      return;
    }
    const t = setTimeout(() => {
      getReferralInfo(code)
        .then((info) => setReferrer(info.referrerFirstName ? { name: info.referrerFirstName } : { notFound: true }))
        .catch(() => setReferrer(null));
    }, 400);
    return () => clearTimeout(t);
  }, [referralCode]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        phone: phone.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        password,
        referralCode: referralCode.trim() || undefined,
      });
      try {
        localStorage.removeItem(REF_KEY);
      } catch {
        // ignore
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/welcome" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Home
        </Link>
        <h1>Create your account</h1>
        <p>Get started with ZAPPI PAY</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            title="Letters, numbers, and underscores only"
            placeholder="Choose a username"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email (optional)</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>Add one so you can reset your password by email if you forget it.</p>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="referralCode">Referral code (optional)</label>
          <input
            id="referralCode"
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Friend's username"
            autoCapitalize="none"
          />
          {referrer?.name && <p style={{ color: 'var(--green-500)', fontSize: 12, margin: '4px 0 0' }}>✓ Invited by {referrer.name}</p>}
          {referrer?.notFound && <p style={{ color: 'var(--gold)', fontSize: 12, margin: '4px 0 0' }}>We couldn't find that code — check it or leave it empty.</p>}
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: 14 }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--orange)' }}>Log in</Link>
      </p>
    </div>
  );
}
