import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api';

// Settings → VTpass: show International airtime & data to customers.
// Keep it off until VTpass live keys are in and a live test top-up works
// (the sandbox has no real prices).
export default function IntlAirtimeToggle() {
  const [on, setOn] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { getSettings().then((d) => setOn(Boolean((d.settings || d).intlAirtimeEnabled))).catch(() => setOn(false)); }, []);
  if (on === null) return null;
  async function toggle(v) {
    setMsg('');
    try { await updateSettings({ intlAirtimeEnabled: v }); setOn(v); setMsg(v ? 'Customers can now see International airtime.' : 'Hidden from customers.'); } catch (e) { setMsg(e.message); }
  }
  return (
    <div className="card" style={{ margin: '16px 0 0', maxWidth: 560 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} style={{ width: 'auto' }} /> 🌍 Show International airtime & data to customers
      </label>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 0' }}>Keep this off until your VTpass LIVE keys are in and VTpass has enabled international airtime on your account. The sandbox doesn’t return real prices, so nothing can be bought there. Test one small live top-up, then turn this on.</p>
      {msg && <p style={{ fontSize: 13, margin: '6px 0 0', color: 'var(--green-500)' }}>{msg}</p>}
    </div>
  );
}
