import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import PasswordField from '../../components/PasswordField';
import { getAdmins, createAdmin, setAdminActive, resetAdminPassword } from '../../api';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminStaff() {
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [savingActiveId, setSavingActiveId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [savingReset, setSavingReset] = useState(false);

  function load() {
    getAdmins()
      .then((data) => setAdmins(data.admins))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createAdmin({ name: name.trim(), email: email.trim(), password });
      setName('');
      setEmail('');
      setPassword('');
      load();
    } catch (err) {
      setFormError(err.message || 'Could not create admin.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(admin) {
    setSavingActiveId(admin.id);
    setError('');
    try {
      await setAdminActive(admin.id, !admin.active);
      load();
    } catch (err) {
      setError(err.message || 'Could not update admin.');
    } finally {
      setSavingActiveId(null);
    }
  }

  function openReset(admin) {
    setResettingId(admin.id);
    setResetPassword('');
    setResetError('');
  }

  async function handleResetSubmit(e, adminId) {
    e.preventDefault();
    setResetError('');
    setSavingReset(true);
    try {
      await resetAdminPassword(adminId, resetPassword);
      setResettingId(null);
    } catch (err) {
      setResetError(err.message || 'Could not reset password.');
    } finally {
      setSavingReset(false);
    }
  }

  // The very first admin in the list (earliest createdAt, since
  // getAdmins already orders that way) is the one created while
  // setting up the app — protected from deactivation on the backend,
  // so the Deactivate button is hidden for it here too rather than
  // showing an action that will just fail.
  const firstAdminId = admins?.[0]?.id;

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Staff</h1>
        <p>Admin accounts with access to this panel</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <form className="card" style={{ margin: '0 0 16px', maxWidth: 400 }} onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Add Admin</h2>
        {formError && <p className="error-text" style={{ margin: '0 0 12px' }}>{formError}</p>}
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Admin'}
        </button>
      </form>

      {resettingId && (
        <form
          className="card"
          style={{ margin: '0 0 16px', maxWidth: 400 }}
          onSubmit={(e) => handleResetSubmit(e, resettingId)}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Reset Password</h2>
          {resetError && <p className="error-text" style={{ margin: '0 0 12px' }}>{resetError}</p>}
          <div className="field">
            <label htmlFor="resetPassword">New password</label>
            <PasswordField id="resetPassword" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={savingReset}>
              {savingReset ? 'Saving…' : 'Set New Password'}
            </button>
            <button className="btn-secondary btn" type="button" onClick={() => setResettingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {admins === null ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Added</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>{a.active ? 'Active' : 'Deactivated'}</td>
                  <td>
                    <div className="admin-actions">
                    <button
                      className="btn-secondary btn"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                      onClick={() => openReset(a)}
                    >
                      Reset Password
                    </button>
                    {a.id !== firstAdminId && (
                      <button
                        className="btn-secondary btn"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                        onClick={() => toggleActive(a)}
                        disabled={savingActiveId === a.id}
                      >
                        {a.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
