import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdmins, createAdmin } from '../../api';

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
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Admin'}
        </button>
      </form>

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
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
