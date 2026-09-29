import { useEffect, useRef, useState } from 'react';

// Camera QR scanner. Uses the phone's built-in detector when available
// (Android Chrome) and the jsQR library otherwise (iPhone etc.).
// Calls onResult(text) once, then closes.
export default function QrScanner({ onResult, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream;
    let stopped = false;
    let raf;
    let detector = null;
    let jsQR = null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setError('Camera not available. Allow camera access for ZAPPI PAY, or type the username instead.');
        return;
      }
      if (stopped) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      if ('BarcodeDetector' in window) {
        try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
      }
      if (!detector) jsQR = (await import('jsqr')).default;
      tick();
    }

    async function tick() {
      if (stopped) return;
      const v = video.current;
      if (v && v.readyState >= 2) {
        try {
          let text = null;
          if (detector) {
            const codes = await detector.detect(v);
            text = codes[0]?.rawValue || null;
          } else if (jsQR) {
            const w = Math.min(640, v.videoWidth);
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || null;
          }
          if (text) {
            stopped = true;
            navigator.vibrate?.(60);
            onResult(text);
            return;
          }
        } catch {
          // keep scanning
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div role="dialog" aria-label="Scan QR code" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 95, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', color: '#fff' }}>
        <b>Scan a ZAPPI PAY QR code</b>
        <button type="button" onClick={onClose} aria-label="Close scanner" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', width: 240, height: 240, border: '3px solid #FFB830', borderRadius: 20, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
        {error && <p style={{ position: 'absolute', bottom: 40, left: 20, right: 20, color: '#fff', textAlign: 'center', background: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 10 }}>{error}</p>}
      </div>
      <p style={{ color: '#cbd5e1', textAlign: 'center', fontSize: 13, padding: 16 }}>Point your camera at the QR code on your friend's phone.</p>
    </div>
  );
}

// Pulls a username out of a scanned ZAPPI PAY QR (…/pay/<username> or
// …/signup?ref=<username>), or a plain username/phone.
export function usernameFromQr(text) {
  const t = String(text || '').trim();
  try {
    const u = new URL(t);
    const m = u.pathname.match(/\/pay\/@?([A-Za-z0-9_]+)/);
    if (m) return m[1].toLowerCase();
    const ref = u.searchParams.get('ref');
    if (ref) return ref.toLowerCase();
    return null;
  } catch {
    return /^@?[A-Za-z0-9_]{3,20}$/.test(t) || /^\+?\d{10,14}$/.test(t) ? t.replace(/^@/, '') : null;
  }
}
