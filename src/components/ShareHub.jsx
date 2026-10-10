import { useState } from 'react';
import { drawInviteImage, recordInviteAnimation, animationSupported, shareFile } from '../lib/shareCard';

const Icon = {
  whatsapp: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.1Z" fill="#fff" />,
  x: <path d="M17.7 3h3l-6.6 7.5L22 21h-6.1l-4.8-6.2L5.6 21h-3l7-8L2.3 3h6.2l4.3 5.7L17.7 3Zm-1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" fill="#fff" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" fill="#fff" /></>,
  snapchat: <path d="M12 3c3 0 5 2.2 5 5v2.2l1.5-.4c.6 0 .9.6.4 1l-1.8 1c.6 1.8 2 3 3.4 3.4.4.1.4.6 0 .8-.7.3-1.6.4-2 .6-.2.4-.1 1-.6 1.1-.6.1-1.4-.2-2.4.2-1 .5-1.8 1.6-3.5 1.6s-2.5-1.1-3.5-1.6c-1-.4-1.8-.1-2.4-.2-.5-.1-.4-.7-.6-1.1-.4-.2-1.3-.3-2-.6-.4-.2-.4-.7 0-.8 1.4-.4 2.8-1.6 3.4-3.4l-1.8-1c-.5-.4-.2-1 .4-1l1.5.4V8c0-2.8 2-5 5-5Z" fill="#111" />,
  facebook: <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7H16l.5-4h-3v-2c0-.6.4-1 1-1Z" fill="#fff" />,
  tiktok: <path d="M16.5 3c.4 2.2 1.8 3.6 4 3.8v3.3c-1.5 0-2.9-.4-4-1.2v6.1a5.9 5.9 0 1 1-5.9-5.9h.6v3.4a2.6 2.6 0 1 0 2 2.5V3h3.3Z" fill="#fff" />,
  telegram: <path d="m3 11.5 16.8-7c.8-.3 1.5.2 1.2 1.4l-2.9 13.6c-.2 1-.8 1.2-1.6.7l-4.4-3.2-2.1 2c-.2.3-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L6.9 13.7 2.6 12.4c-.9-.3-.9-.9.4-.9Z" fill="#fff" />,
  more: <><circle cx="6" cy="12" r="2" fill="#fff" /><circle cx="12" cy="12" r="2" fill="#fff" /><circle cx="18" cy="12" r="2" fill="#fff" /></>,
};

function Round({ bg, icon, label, onClick, href }) {
  const inner = (
    <>
      <span style={{ width: 58, height: 58, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">{Icon[icon]}</svg>
      </span>
      <span style={{ fontSize: 12, marginTop: 6, color: 'var(--slate-300, #cbd5e1)' }}>{label}</span>
    </>
  );
  const style = { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none', color: 'inherit' };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={style} onClick={onClick}>{inner}</a>
    : <button type="button" style={style} onClick={onClick}>{inner}</button>;
}

// Refer & Earn sharing: social buttons, a share picture with a QR code,
// a 3-second animated invite, and one-tap copy tools.
export default function ShareHub({ code, link, firstName, bonus, minPurchase, spendTarget }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState(null); // { url, blob, fileName, video, app }

  const text = `Join me on ZAPPI PAY — airtime, data, electricity, cable TV & exam PINs in seconds. Sign up with my code ${code}: ${link}`;
  const details = { code, link, firstName };

  function flash(m) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3500);
  }

  async function copy(value, what) {
    try {
      await navigator.clipboard.writeText(value);
      flash(`${what} copied ✅`);
    } catch {
      flash('Could not copy — press and hold to copy instead.');
    }
  }

  // Make the picture/video, then show it so the person can see it
  // before sharing or saving (on computers the share window alone
  // doesn't show the picture).
  async function makeImage(appName) {
    setBusy('image');
    try {
      const blob = await drawInviteImage(details);
      openPreview({ blob, fileName: `zappipay-invite-${code}.png`, video: false, app: appName });
    } catch (err) {
      flash(err.message || 'Could not create the picture.');
    } finally {
      setBusy('');
    }
  }

  async function makeVideo() {
    setBusy('video');
    try {
      const { blob, ext } = await recordInviteAnimation(details);
      openPreview({ blob, fileName: `zappipay-invite-${code}.${ext}`, video: true });
    } catch (err) {
      flash(err.message || 'Could not create the video.');
    } finally {
      setBusy('');
    }
  }

  function openPreview(p) {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview({ ...p, url: URL.createObjectURL(p.blob) });
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function sharePreview() {
    const r = await shareFile(preview.blob, preview.fileName, text);
    if (r === 'downloaded') {
      await navigator.clipboard?.writeText(text).catch(() => {});
      flash('Saved to your downloads, and the caption is copied.');
    }
  }

  function downloadPreview() {
    const a = document.createElement('a');
    a.href = preview.url;
    a.download = preview.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    navigator.clipboard?.writeText(text).catch(() => {});
    flash('Saved to your downloads, and the caption is copied — paste it when you post.');
  }

  async function more() {
    if (navigator.share) {
      try { await navigator.share({ title: 'ZAPPI PAY', text, url: link }); } catch { /* cancelled */ }
    } else {
      copy(text, 'Invitation');
    }
  }

  const enc = encodeURIComponent;
  const btn = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };

  return (
    <>
      <div className="card" style={{ background: 'linear-gradient(180deg, rgba(134,59,255,0.14), rgba(134,59,255,0.04))', border: '1px solid rgba(134,59,255,0.35)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📤</span>
          <div>
            <b style={{ fontSize: 16 }}>Share. Help a friend. Earn.</b>
            <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>
              {bonus > 0 ? (spendTarget > 0 ? `You get ₦${Number(bonus).toLocaleString()} when they join and spend ₦${Number(spendTarget).toLocaleString()} in total.` : `You get ₦${Number(bonus).toLocaleString()} when they join and start buying (from ₦${Number(minPurchase || 0).toLocaleString()}).`) : 'Invite friends to ZAPPI PAY.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 6px', marginBottom: 14 }}>
          <Round bg="#25D366" icon="whatsapp" label="WhatsApp" href={`https://wa.me/?text=${enc(text)}`} />
          <Round bg="#000" icon="x" label="X" href={`https://twitter.com/intent/tweet?text=${enc(text)}`} />
          <Round bg="linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)" icon="instagram" label="Instagram" onClick={() => makeImage('Instagram')} />
          <Round bg="#FFFC00" icon="snapchat" label="Snapchat" onClick={() => makeImage('Snapchat')} />
          <Round bg="#1877F2" icon="facebook" label="Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(text)}`} />
          <Round bg="#000" icon="tiktok" label="TikTok" onClick={() => makeImage('TikTok')} />
          <Round bg="#29A9EB" icon="telegram" label="Telegram" href={`https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`} />
          <Round bg="#1e293b" icon="more" label="More" onClick={more} />
        </div>
        <button type="button" className="btn" style={btn} disabled={Boolean(busy)} onClick={() => makeImage()}>
          🖼️ {busy === 'image' ? 'Creating picture…' : 'Create share image'}
        </button>
        {animationSupported() && (
          <button type="button" className="btn btn-secondary" style={{ ...btn, marginTop: 8 }} disabled={Boolean(busy)} onClick={makeVideo}>
            ✨ {busy === 'video' ? 'Recording 3 seconds…' : 'Create 3-second animated share'}
          </button>
        )}
        {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: 'var(--green-500)' }}>{msg}</p>}
      </div>

      {preview && (
        <div role="dialog" aria-label="Your invite" onClick={(e) => e.target === e.currentTarget && closePreview()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: 'min(420px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: 'var(--slate-800)', borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b>{preview.video ? 'Your 3-second invite video' : 'Your invite picture'}</b>
              <button type="button" aria-label="Close" onClick={closePreview} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            {preview.video
              ? <video src={preview.url} autoPlay loop muted playsInline style={{ width: '100%', borderRadius: 12, display: 'block' }} />
              : <img src={preview.url} alt="Invite picture with your code and QR" style={{ width: '100%', borderRadius: 12, display: 'block' }} />}
            {preview.app && <p style={{ fontSize: 13, color: 'var(--slate-300, #cbd5e1)', margin: '10px 0 0' }}>Tap Share and pick {preview.app}, or Download it and post it from the {preview.app} app.</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="btn" onClick={sharePreview}>Share</button>
              <button type="button" className="btn btn-secondary" onClick={downloadPreview}>Download</button>
            </div>
            <button type="button" onClick={() => copy(text, 'Caption')} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 13, marginTop: 10, padding: 0 }}>Copy caption to paste with it</button>
            {msg && <p style={{ fontSize: 13, margin: '8px 0 0', color: 'var(--green-500)' }}>{msg}</p>}
          </div>
        </div>
      )}

      <div className="card">
        <b>Invitation tools</b>
        <div style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 10 }}>Choose exactly what you want to copy.</div>
        {[
          ['#', 'Copy referral code', code, 'Code'],
          ['🔗', 'Copy referral sign-up link', link, 'Link'],
          ['💬', 'Copy invitation text with link', text, 'Invitation'],
        ].map(([ic, label, value, what]) => (
          <button key={label} type="button" onClick={() => copy(value, what)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, background: 'var(--slate-900)', border: '1px solid var(--slate-700)', color: 'inherit', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', fontSize: 14, textAlign: 'left' }}>
            <span style={{ width: 22, textAlign: 'center' }}>{ic}</span>
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ color: 'var(--slate-400)' }}>⧉</span>
          </button>
        ))}
      </div>
    </>
  );
}
