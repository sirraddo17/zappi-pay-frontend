import { useFeatures } from './ServiceNotices';
import { useEffect, useState } from 'react';
import { qrDataUrl, shareFile } from '../lib/shareCard';

// One QR code per customer: zappipay.com.ng/pay/<username>.
// - Scanned in ZAPPI PAY (Send Money → Scan) it fills in who to pay.
// - Scanned with any phone camera by someone new, it opens sign-up
//   with this customer's referral code; by an existing user, it opens
//   Send Money to them.
export function payLink(username) {
  return `${window.location.origin}/pay/${encodeURIComponent(username)}`;
}

export default function MyQr({ code, compact = false }) {
  const canPay = Boolean(useFeatures().sendMoney);
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState('');
  const link = payLink(code);

  useEffect(() => {
    if (open && !img) qrDataUrl(link, 560).then(setImg).catch(() => {});
  }, [open]);

  async function save() {
    const blob = await (await fetch(img)).blob();
    await shareFile(blob, `zappipay-qr-${code}.png`, canPay ? `Pay me or join ZAPPI PAY with my code ${code}: ${link}` : `Join ZAPPI PAY with my code ${code}: ${link}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? 'btn btn-secondary' : undefined}
        style={compact ? { width: 'auto', padding: '8px 12px' } : { background: 'none', border: 'none', color: 'var(--purple)', marginTop: 10, cursor: 'pointer', fontSize: 14, padding: 0, fontWeight: 600 }}>
        ▦ Show my QR code
      </button>
      {open && (
        <div role="dialog" aria-label="My QR code" onClick={(e) => e.target === e.currentTarget && setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 'min(360px, 100%)', background: 'var(--slate-800)', borderRadius: 18, padding: 20, textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>My ZAPPI PAY QR</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 12px' }}>ZAPPI PAY users scan it to send you money. New people scan it to join with your code.</p>
            <div style={{ background: '#fff', borderRadius: 14, padding: 12, display: 'inline-block' }}>
              {img ? <img src={img} alt={`QR code for ${code}`} style={{ width: 240, height: 240, display: 'block' }} /> : <div style={{ width: 240, height: 240 }} />}
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, marginTop: 10 }}>@{code}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn" disabled={!img} onClick={save}>Save / share</button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
