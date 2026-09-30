import { useEffect, useState } from 'react';
import { getOrderGift, makeOrderGift } from '../api';
import { useAuth } from '../context/AuthContext';
import GiftForm from './GiftForm';
import { GIFT_THEMES, giftShareText } from '../lib/giftThemes';

// Receipt: share the gift card for an airtime/data purchase, or turn
// the purchase into one.
export default function GiftPanel({ order, autoOpen = false }) {
  const { customer } = useAuth();
  const [gift, setGift] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('JUST_BECAUSE');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const giftable = ['AIRTIME', 'DATA'].includes(order.service) && ['SUCCESS', 'PENDING'].includes(order.status)
    && String(order.recipient).replace(/\D/g, '').slice(-10) !== String(customer?.phone || '').replace(/\D/g, '').slice(-10);

  useEffect(() => {
    if (!giftable) return;
    getOrderGift(order.id).then((d) => {
      setGift(d.gift);
      if (d.gift) { setTheme(d.gift.theme); setMessage(d.gift.message || ''); }
    }).catch(() => setGift(null));
  }, [order.id, giftable]);

  if (!giftable || gift === undefined) return null;

  async function save() {
    setBusy(true);
    setErr('');
    try {
      const d = await makeOrderGift(order.id, { theme, message });
      setGift(d.gift);
      setOpen(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const fromName = String(customer?.name || '').split(/\s+/)[0];
  const text = gift ? giftShareText(gift, { fromName, value: Math.round(Number(order.costAmount || order.amount)), kind: order.service === 'AIRTIME' ? 'airtime' : 'data' }) : '';
  const t = GIFT_THEMES[gift?.theme] || GIFT_THEMES.JUST_BECAUSE;

  async function copy() {
    try {
      await navigator.clipboard.writeText(gift.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', gift.link);
    }
  }

  if (!gift && !open && !autoOpen) {
    return (
      <button type="button" className="btn-secondary btn no-print" style={{ marginBottom: 8 }} onClick={() => setOpen(true)}>
        🎁 Send as a gift card
      </button>
    );
  }

  return (
    <div className="card no-print" style={{ margin: '0 0 8px', border: '1px solid var(--purple)' }}>
      {gift && !open ? (
        <>
          <div style={{ background: t.bg, borderRadius: 12, padding: 14, color: '#fff', marginBottom: 10 }}>
            <div style={{ fontSize: 26 }}>{t.emoji}</div>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            {gift.message && <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>“{gift.message}”</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              className="btn"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25d366', color: '#0f1628' }}
              href={`https://wa.me/${gift.whatsapp || ''}?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
            >
              Send on WhatsApp
            </a>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--slate-400)' }}>
            <span>{gift.viewCount > 0 ? `Opened ${gift.viewCount} time${gift.viewCount === 1 ? '' : 's'} 👀` : 'Not opened yet'}</span>
            <button type="button" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 12, padding: 0, cursor: 'pointer' }}>Edit message</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700 }}>🎁 Gift card for {order.recipient}</div>
          <GiftForm theme={theme} setTheme={setTheme} message={message} setMessage={setMessage} />
          {err && <p className="error-text" style={{ margin: '8px 0 0' }}>{err}</p>}
          <button type="button" className="btn" style={{ marginTop: 10 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : gift ? 'Save' : 'Create gift card'}</button>
        </>
      )}
    </div>
  );
}
