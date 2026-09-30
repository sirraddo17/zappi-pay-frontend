import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import LanguagePicker from '../components/LanguagePicker';
import { useShowMore } from '../components/ShowMore';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe, changePassword, getSupportTickets } from '../api';
import PasswordField from '../components/PasswordField';
import BottomNav from '../components/BottomNav';
import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from '../assistant/knowledge';
import { useAppInfo } from '../components/ServiceNotices';
import AccountExtras from '../components/AccountExtras';
import AgentCard from '../components/AgentCard';
import MyShopCard from '../components/MyShopCard';
import NewPasswordFields from '../components/NewPasswordFields';
import SecurityDetailsCard from '../components/SecurityDetailsCard';
import SocialLinks from '../components/SocialLinks';
import ThemeToggle from '../components/ThemeToggle';
import { passwordIsStrong } from '../lib/passwordRules';

const MAX_AVATAR_BYTES = 1_500_000;

export default function Profile() {
  const t = useLang();
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [tickets, setTickets] = useState(null);
  // Open tickets first, then solved (newest first within each).
  const sortedTickets = tickets === null ? null : [...tickets].sort((x, y) => (x.status === 'RESOLVED') - (y.status === 'RESOLVED'));
  const ticketPage = useShowMore(sortedTickets, [], 3);

  useEffect(() => {
    getSupportTickets()
      .then((data) => setTickets(data.tickets))
      .catch(() => setTickets([]));
  }, []);

  const appInfo = useAppInfo();
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
    if (!passwordIsStrong(newPassword)) return setPasswordError('Your new password needs a capital letter, a small letter, a number and a special character, and at least 8 characters.');
    if (newPassword !== confirmPassword) return setPasswordError("The two new passwords don't match.");
    setChangingPassword(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res?.token) localStorage.setItem('zappipay_customer_token', res.token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
            <span style={{ display: 'block', fontWeight: 600 }}>{t('Security')}</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>PIN, quick login, fingerprint / Face ID</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
        <Link
          to="/statement"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', color: 'var(--slate-100, #f1f5f9)', textDecoration: 'none', borderBottom: '1px solid var(--slate-700)' }}
        >
          <span>
            <span style={{ display: 'block', fontWeight: 600 }}>{t('Account Statement')}</span>
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
            <span style={{ display: 'block', fontWeight: 600 }}>{t('Refer & Earn')}</span>
            <span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 13 }}>Invite friends and earn a bonus</span>
          </span>
          <span style={{ color: 'var(--slate-400)' }}>›</span>
        </Link>
      </div>

      <form className="card" style={{ margin: '0 0 16px' }} onSubmit={handlePasswordChange}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{t('Change Password')}</h2>
        {passwordError && <p className="error-text" style={{ margin: '0 0 12px' }}>{passwordError}</p>}
        {passwordSuccess && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{passwordSuccess}</p>}
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <PasswordField id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <NewPasswordFields password={newPassword} setPassword={setNewPassword} confirm={confirmPassword} setConfirm={setConfirmPassword} idPrefix="prof" label="New password" />
        <button className="btn" type="submit" disabled={changingPassword}>
          {changingPassword ? 'Saving…' : 'Change Password'}
        </button>
      </form>

      <SecurityDetailsCard />

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Follow us</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -6 }}>Promos, new services and updates first.</p>
        <SocialLinks />
      </div>

      <ThemeToggle style={{ margin: '0 0 16px' }} />
      <LanguagePicker style={{ margin: '0 0 16px' }} />

      <div className="card" style={{ margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{t('Support')}</h2>
        <button
          type="button"
          className="btn"
          style={{ marginBottom: 10 }}
          onClick={() => window.dispatchEvent(new CustomEvent('zappipay:support', { detail: {} }))}
        >
          💬 Message support in the app
        </button>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '10px 0 4px', fontSize: 13 }}>
          <Link to="/help" style={{ color: 'var(--purple)', textDecoration: 'none' }}>❓ Help Centre</Link>
          <Link to="/status" style={{ color: 'var(--purple)', textDecoration: 'none' }}>🟢 Service status</Link>
        </div>
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '-4px 0 10px' }}>Problems, account changes, suggestions — anything. You can add screenshots. We reply here and in your notifications.</p>
        <a
          href={`https://wa.me/${appInfo?.supportWhatsapp || WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello ZappiPay, I need help with')}`}
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
          ticketPage.visible.map((t) => {
            const solved = t.status === 'RESOLVED';
            return (
              // Solved tickets fold to one line so the page stays short;
              // tap to read the reply. Open ones stay expanded.
              <details key={t.id} open={!solved} style={{ borderTop: '1px solid var(--slate-700)', padding: '10px 0', fontSize: 14 }}>
                <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer', listStyle: 'none' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: solved ? 'nowrap' : 'normal' }}>
                    {t.message}
                    {t.createdAt && <span style={{ color: 'var(--slate-400)', fontSize: 12 }}> · {new Date(t.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>}
                  </span>
                  <span style={{ color: solved ? 'var(--green-500)' : 'var(--orange)', whiteSpace: 'nowrap' }}>
                    {solved ? 'Solved ▾' : 'Open'}
                  </span>
                </summary>
                {t.adminReply ? (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--slate-900)', borderRadius: 8, borderLeft: '3px solid var(--purple)', whiteSpace: 'pre-wrap', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>ZappiPay Support replied:</div>
                    {t.adminReply}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, color: 'var(--slate-400)', fontSize: 13 }}>{solved ? 'Marked solved.' : 'We’ve received this and will reply here.'}</div>
                )}
              </details>
            );
          })
        )}
        {ticketPage.more}
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

      <AgentCard />
      {customer?.isAgent && (
        <Link to="/profit-book" className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <span>
            <strong style={{ fontSize: 15 }}>📒 Profit book</strong>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--slate-400)' }}>Your sales, profit and who owes you</span>
          </span>
          <span style={{ color: 'var(--purple)' }}>›</span>
        </Link>
      )}
      <MyShopCard />

      <AccountExtras />

      <button className="btn-secondary btn" type="button" onClick={handleLogout}>
        Log Out
      </button>

      <BottomNav />
    </div>
  );
}
