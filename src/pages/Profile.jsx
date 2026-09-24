import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe, changePassword, getSupportTickets } from '../api';
import PasswordField from '../components/PasswordField';
import BottomNav from '../components/BottomNav';
import { SUPPORT_EMAIL } from '../assistant/knowledge';

const MAX_AVATAR_BYTES = 1_500_000;

export default function Profile() {
  const { customer, logout, refreshCustomer } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [avatarError, setAvatarError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [tickets, setTickets] = useState(null);

  useEffect(() => {
    getSupportTickets()
      .then((data) => setTickets(data.tickets))
      .catch(() => setTickets([]));
  }, []);

  const initial = (customer?.name || '?').charAt(0).toUpperCase();

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSaving(true);
    try {
      await updateMe({ name: name.trim(), email: email.trim() });
      await refreshCustomer();
      setSuccessMessage('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image is too large. Please choose a photo under 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingAvatar(true);
      try {
        await updateMe({ avatarUrl: reader.result });
        await refreshCustomer();
      } catch (err) {
        setAvatarError(err.message || 'Could not upload photo.');
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.onerror = () => setAvatarError('Could not read that file.');
    reader.readAsDataURL(file);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess('Password changed.');
    } catch (err) {
      setPasswordError(err.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px 90px' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 12, color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
        &larr; Back
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploadingAvatar}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: customer?.avatarUrl ? 'transparent' : 'var(--orange)',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 8,
            cursor: 'pointer',
            overflow: 'hidden',
            opacity: uploadingAvatar ? 0.6 : 1,
          }}
        >
          {customer?.avatarUrl ? (
            <img src={customer.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initial
          )}
        </button>
        <span style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 8 }}>
          {uploadingAvatar ? 'Uploading…' : 'Tap to change photo'}
        </span>
        {avatarError && <p className="error-text" style={{ margin: '0 0 8px', fontSize: 13 }}>{avatarError}</p>}
        <h1 style={{ margin: 0, fontSize: 20 }}>{customer?.name}</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--slate-400)', fontSize: 14 }}>{customer?.phone}</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {successMessage && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{successMessage}</p>}

      <form className="card" style={{ margin: '0 0 16px' }} onSubmit={handleSave}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="card" style={{ margin: '0 0 16px', paddingTop: 4, paddingBottom: 4 }}>
        <Link
          to="/security"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: '1px solid var(--slate-700)' }}
        >
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>Security</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>PIN, quick login, fingerprint / Face ID</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
        <Link
          to="/statement"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: '1px solid var(--slate-700)' }}
        >
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>Account Statement</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>Download your wallet history as PDF</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
        <Link
          to="/saved"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: '1px solid var(--slate-700)' }}
        >
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>Saved &amp; Scheduled</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>Saved numbers and automatic top-ups</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
        <Link
          to="/refer"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: 'none' }}
        >
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>Refer & Earn</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>Invite friends and earn a bonus</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
      </div>

      <form className="card" style={{ margin: '0 0 16px' }} onSubmit={handlePasswordChange}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Change Password</h2>
        {passwordError && <p className="error-text" style={{ margin: '0 0 12px' }}>{passwordError}</p>}
        {passwordSuccess && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{passwordSuccess}</p>}
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <PasswordField id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <PasswordField id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        <button className="btn" type="submit" disabled={changingPassword}>
          {changingPassword ? 'Saving…' : 'Change Password'}
        </button>
      </form>

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Support</h2>
        <a
          href={`https://wa.me/2348134209037?text=${encodeURIComponent('Hello ZappiPay, I need help with')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 8 }}
        >
          Chat on WhatsApp
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ZappiPay support')}`}
          className="btn-secondary btn"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 16 }}
        >
          Email {SUPPORT_EMAIL}
        </a>
        {tickets === null ? (
          <p className="empty-state">Loading…</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>No support requests yet.</p>
        ) : (
          tickets.map((t) => (
            <div key={t.id} style={{ borderTop: '1px solid var(--slate-700)', padding: '10px 0', fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{t.message}</span>
                <span style={{ color: t.status === 'RESOLVED' ? 'var(--green-500)' : 'var(--orange)', whiteSpace: 'nowrap' }}>
                  {t.status === 'RESOLVED' ? 'Solved' : 'Open'}
                </span>
              </div>
              {t.adminReply && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--slate-900)', borderRadius: 8, borderLeft: '3px solid var(--purple)', whiteSpace: 'pre-wrap', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>ZappiPay Support replied:</div>
                  {t.adminReply}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>About the App</h2>
        {[
          ['about', 'About Us'],
          ['how-it-works', 'How It Works'],
          ['terms', 'Terms & Conditions'],
          ['privacy', 'Privacy Policy'],
          ['contact', 'Contact Us'],
        ].map(([slug, label]) => (
          <Link
            key={slug}
            to={`/legal/${slug}`}
            style={{ display: 'block', padding: '10px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: '1px solid var(--slate-700)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      <button className="btn-secondary btn" type="button" onClick={handleLogout}>
        Log Out
      </button>

      <BottomNav />
    </div>
  );
}
