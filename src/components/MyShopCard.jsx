import { useEffect, useState } from 'react';
import { getMyShop, saveMyShop } from '../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Profile (agents): shop link on/off, tagline, WhatsApp button, sales.
export default function MyShopCard() {
  const [d, setD] = useState(null);
  const [tagline, setTagline] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMyShop().then((x) => { setD(x); setTagline(x.tagline || ''); }).catch(() => setD(null));
  }, []);
  if (!d || !d.available || !d.isAgent) return null;

  const link = d.username ? `${window.location.origin}/shop/${d.username}` : '';
  async function save(patch) {
    setBusy(true);
    setErr('');
    try {
      const x = await saveMyShop(patch);
      setD(x);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    const text = `Buy airtime, data, electricity and TV from my shop on ZAPPI PAY: ${link}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your shop link', link);
    }
  }

  return (
    <div className="card" style={{ border: '1px solid var(--gold)' }}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🏪 My shop link</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Share your link. When customers buy through it, you earn {d.commissionPct}% of each purchase{d.commissionMax ? ` (up to ${naira(d.commissionMax)} a sale)` : ''} in your wallet — they pay the normal price.
      </p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, marginBottom: 10 }}>
        <input type="checkbox" checked={d.enabled} disabled={busy} onChange={(e) => save({ enabled: e.target.checked })} style={{ width: 'auto' }} /> Shop link on
      </label>
      {d.enabled && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input readOnly value={link} aria-label="Your shop link" style={{ flex: 1, minWidth: 0 }} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn" style={{ width: 'auto' }} onClick={share}>{copied ? 'Copied ✓' : 'Share'}</button>
          </div>
          <div className="field">
            <label htmlFor="shop-tag">Shop tagline</label>
            <input id="shop-tag" value={tagline} maxLength={100} onChange={(e) => setTagline(e.target.value)} onBlur={() => tagline !== (d.tagline || '') && save({ tagline })} placeholder="e.g. Cheap data & light, Ojota market" />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
            <input type="checkbox" checked={d.showWhatsapp} disabled={busy} onChange={(e) => save({ showWhatsapp: e.target.checked })} style={{ width: 'auto' }} /> Show a “Chat on WhatsApp” button with my number
          </label>
          <div style={{ fontSize: 13 }}>Last 30 days: <b>{d.last30.sales}</b> sale{d.last30.sales === 1 ? '' : 's'} · <b style={{ color: 'var(--green-500)' }}>{naira(d.last30.earned)}</b> earned</div>
        </>
      )}
    </div>
  );
}
