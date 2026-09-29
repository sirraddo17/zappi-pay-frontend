import QRCode from 'qrcode';

// Invite pictures and a 3-second animated invite for Refer & Earn.
// Both include a QR code that opens the sign-up page with the code.

const W = 1080;
const H = 1350;
const font = (w, px) => `${w} ${px}px Poppins, "Segoe UI", Roboto, Arial, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLogo(ctx, x, y, s) {
  const k = s / 300;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  roundRect(ctx, 0, 0, 300, 300, 72);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  roundRect(ctx, 50, 68, 200, 36, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(230, 104); ctx.lineTo(70, 184); ctx.lineTo(114, 184); ctx.lineTo(274, 104); ctx.closePath(); ctx.fill();
  roundRect(ctx, 50, 184, 200, 36, 8); ctx.fill();
  ctx.fillStyle = '#FFB830';
  ctx.beginPath(); ctx.moveTo(236, 12); ctx.lineTo(218, 58); ctx.lineTo(232, 58); ctx.lineTo(210, 108); ctx.lineTo(258, 48); ctx.lineTo(242, 48); ctx.closePath(); ctx.fill();
  ctx.restore();
}

async function qrImage(link) {
  const url = await QRCode.toDataURL(link, { margin: 1, width: 420, color: { dark: '#2a0b66', light: '#ffffff' }, errorCorrectionLevel: 'M' });
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function background(ctx, t = 0) {
  const g = ctx.createRadialGradient(W * (0.8 - 0.1 * t), H * 0.1, 60, W * 0.5, H * 0.5, H);
  g.addColorStop(0, '#a46bff');
  g.addColorStop(0.35, '#863bff');
  g.addColorStop(0.75, '#5b1fc4');
  g.addColorStop(1, '#2a0b66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, H, 10, W, H, 700);
  glow.addColorStop(0, 'rgba(255,184,48,0.35)');
  glow.addColorStop(1, 'rgba(255,184,48,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

// p = 0..1 animation progress for each part; 1 = fully shown.
function drawFrame(ctx, d, qr, p = {}) {
  const a = (k) => Math.max(0, Math.min(1, p[k] ?? 1));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  background(ctx, a('bg'));
  ctx.textAlign = 'center';

  ctx.globalAlpha = a('logo');
  const s = 150 * (0.6 + 0.4 * ease(a('logo')));
  drawLogo(ctx, W / 2 - s / 2, 90 + (150 - s) / 2, s);
  ctx.globalAlpha = 1;

  const t1 = ease(a('title'));
  ctx.globalAlpha = t1;
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 40);
  ctx.fillText('ZAPPI PAY', W / 2, 300);
  ctx.font = font(700, 86);
  ctx.fillText('Airtime, data &', W / 2, 420 + (1 - t1) * 40);
  ctx.fillStyle = '#FFB830';
  ctx.fillText('bills in seconds', W / 2, 515 + (1 - t1) * 40);
  ctx.globalAlpha = 1;

  const t2 = ease(a('invite'));
  ctx.globalAlpha = t2;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = font(500, 36);
  ctx.fillText(`${d.firstName ? `${d.firstName} invited you` : 'You are invited'} — sign up with code`, W / 2, 610);
  roundRect(ctx, W / 2 - 250, 640, 500, 96, 48);
  ctx.fillStyle = '#FFB830';
  ctx.fill();
  ctx.fillStyle = '#2a0b66';
  ctx.font = font(700, 54);
  ctx.fillText(d.code, W / 2, 707);
  ctx.globalAlpha = 1;

  const t3 = ease(a('qr'));
  ctx.globalAlpha = t3;
  const qs = 330 * (0.85 + 0.15 * t3);
  roundRect(ctx, W / 2 - qs / 2 - 24, 790, qs + 48, qs + 48, 32);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.drawImage(qr, W / 2 - qs / 2, 814, qs, qs);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = font(500, 30);
  ctx.fillText('Scan to join, or visit', W / 2, 1230);
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 36);
  ctx.fillText(String(d.link).replace(/^https?:\/\//, ''), W / 2, 1282);
  ctx.globalAlpha = 1;
}

export async function drawInviteImage(details) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const qr = await qrImage(details.link);
  drawFrame(c.getContext('2d'), details, qr);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

export function animationSupported() {
  return typeof window.MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

// Records a 3-second animation of the invite card. Prefers MP4 (plays
// everywhere, WhatsApp Status included) and falls back to WebM.
export async function recordInviteAnimation(details) {
  if (!animationSupported()) throw new Error("This browser can't make videos. Use the share image instead.");
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const qr = await qrImage(details.link);
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => { rec.onstop = resolve; });

  const DURATION = 3000;
  const seg = (t, from, to) => (t - from) / (to - from);
  rec.start(100);
  const start = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      const t = performance.now() - start;
      drawFrame(ctx, details, qr, { bg: t / DURATION, logo: seg(t, 0, 450), title: seg(t, 300, 900), invite: seg(t, 900, 1500), qr: seg(t, 1500, 2100) });
      if (t < DURATION) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  const type = (mimeType || 'video/webm').split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}

// Opens the phone's share sheet with a file (so the person can pick
// WhatsApp, Instagram, TikTok, Snapchat...), else downloads it.
export async function shareFile(blob, fileName, text) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'ZAPPI PAY' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

export async function qrDataUrl(text, size = 320) {
  return QRCode.toDataURL(text, { margin: 1, width: size, color: { dark: '#2a0b66', light: '#ffffff' }, errorCorrectionLevel: 'M' });
}
