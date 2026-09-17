import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe } from '../api';

export default function Profile() {
  const { customer, logout, refreshCustomer } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px 90px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 12,
          }}
        >
          {initial}
        </div>
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

      <button className="btn-secondary btn" type="button" onClick={handleLogout}>
        Log Out
      </button>
    </div>
  );
}
