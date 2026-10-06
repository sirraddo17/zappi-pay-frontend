import { useEffect, useRef } from 'react';

// A short confetti burst + vibration for a successful payment.
// Respects "reduce motion" and stops by itself after ~2.5 seconds.
export default function Celebrate({ run = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    try { navigator.vibrate?.([30, 40, 60]); } catch { /* not supported */ }
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
    const colors = ['#863bff', '#f5b82e', '#22c55e', '#ffffff', '#ec4899', '#38bdf8'];
    const bits = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 60, y: H * 0.32,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      col: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.vy += 0.32; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.fillStyle = b.col; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r)));
        ctx.restore();
      }
      if (t < 2600) frame = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run]);
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 2000 }} />;
}

// Big animated tick / clock / cross for a payment result.
export function ResultBadge({ status }) {
  const ok = status === 'SUCCESS' || status === 'DELIVERED';
  const fail = status === 'FAILED';
  return (
    <div className={`result-badge ${ok ? 'ok' : fail ? 'fail' : 'wait'}`} aria-hidden="true">
      {ok ? (
        <svg viewBox="0 0 52 52" width="64" height="64"><circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" /><path d="M15 27l7 7 15-16" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : fail ? (
        <svg viewBox="0 0 52 52" width="64" height="64"><circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" /><path d="M18 18l16 16M34 18L18 34" fill="none" strokeWidth="4" strokeLinecap="round" /></svg>
      ) : (
        <svg viewBox="0 0 52 52" width="64" height="64"><circle className="spin" cx="26" cy="26" r="22" fill="none" strokeWidth="4" strokeDasharray="100 40" strokeLinecap="round" /></svg>
      )}
    </div>
  );
}
