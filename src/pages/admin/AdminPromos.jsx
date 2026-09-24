import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminPromos, createPromo, updatePromo } from '../../api';

const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'INTERNET', 'BETTING'];
const label = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const money = (n) => `₦${Number(n || 0).toLocaleString()}`;

const EMPTY = { code: '', description: '', type: 'FLAT', value: '', maxDiscount: '', minAmount: '', services: [], usageLimit: '', perCustomerLimit: '1', newCustomersOnly: false, expiresAt: '' };

// Promo codes customers type at checkout.
export default function AdminPromos() {
  const [promos, setPromos] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getAdminPromos().then((d) => setPromos(d.promos)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await createPromo({ ...form, value: Number(form.value), expiresAt: form.expiresAt || null });
      setMessage(`Promo ${form.code.toUpperCase()} created.`);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p) {
    try {
      await updatePromo(p.id, { active: !p.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Promo Codes</h1>
        <p>Discount codes customers enter when paying, e.g. FIRST50</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', margin: '0 0 12px' }}>{message}</p>}

      <form className="card" style={{ margin: '0 0 16px', maxWidth: 560 }} onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>New promo code</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="pc">Code</label>
            <input id="pc" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="FIRST50" required />
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="pt">Type</label>
            <select id="pt" value={form.type} onChange={set('type')}>
              <option value="FLAT">₦ off</option>
              <option value="PERCENT">% off</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="pv">{form.type === 'PERCENT' ? 'Percent' : 'Amount (₦)'}</label>
            <input id="pv" type="number" min="1" step="any" value={form.value} onChange={set('value')} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pd">Description (optional, shown to customers)</label>
          <input id="pd" value={form.description} onChange={set('description')} maxLength={120} placeholder="₦50 off your first data purchase" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {form.type === 'PERCENT' && (
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label htmlFor="pm">Max discount (₦)</label>
              <input id="pm" type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="No max" />
            </div>
          )}
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="pmin">Min purchase (₦)</label>
            <input id="pmin" type="number" min="0" value={form.minAmount} onChange={set('minAmount')} placeholder="0" />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="pu">Total uses allowed</label>
            <input id="pu" type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="ppc">Uses per customer</label>
            <input id="ppc" type="number" min="1" value={form.perCustomerLimit} onChange={set('perCustomerLimit')} />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="pe">Expires (optional)</label>
            <input id="pe" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
          </div>
        </div>
        <div className="field">
          <label>Services (none ticked = all services)</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {SERVICES.map((s) => (
              <label key={s} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 14 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={form.services.includes(s)}
                  onChange={(e) => setForm((f) => ({ ...f, services: e.target.checked ? [...f.services, s] : f.services.filter((x) => x !== s) }))}
                />
                {label(s)}
              </label>
            ))}
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 12 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.newCustomersOnly} onChange={set('newCustomersOnly')} />
          First purchase only (new customers)
        </label>
        <button className="btn" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create promo code'}</button>
      </form>

      {promos === null ? (
        <p className="empty-state">Loading…</p>
      ) : promos.length === 0 ? (
        <p className="empty-state">No promo codes yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Rules</th><th>Used</th><th>Given away</th><th>Status</th></tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.code}</strong>{p.description && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{p.description}</div>}</td>
                <td>{p.type === 'PERCENT' ? `${Number(p.value)}%${p.maxDiscount ? ` (max ${money(p.maxDiscount)})` : ''}` : money(p.value)}</td>
                <td style={{ fontSize: 12 }}>
                  {p.services.length ? p.services.map(label).join(', ') : 'All services'}
                  {Number(p.minAmount) > 0 && ` · min ${money(p.minAmount)}`}
                  {p.newCustomersOnly && ' · first purchase'}
                  {p.expiresAt && ` · until ${new Date(p.expiresAt).toLocaleDateString('en-NG')}`}
                </td>
                <td>{p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ''}</td>
                <td>{money(p.totalDiscount)}</td>
                <td>
                  <button type="button" className={p.active ? 'btn btn-secondary' : 'btn'} style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => toggle(p)}>
                    {p.active ? 'Turn off' : 'Turn on'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
