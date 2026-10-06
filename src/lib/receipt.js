// Branded receipt image (PNG) drawn on a canvas, so customers can share
// real "proof of payment" to WhatsApp etc. — not just plain text.

import QRCode from 'qrcode';
import { getReceiptInvite } from '../api';

const W = 720;
const PAD = 48;
const PURPLE = '#7c3aed';

function money(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusColor(status) {
  const s = String(status || '').toUpperCase();
  if (['SUCCESS', 'DELIVERED', 'SENT', 'APPROVED'].includes(s)) return '#16a34a';
  if (['FAILED', 'REVERSED', 'REJECTED'].includes(s)) return '#dc2626';
  return '#ea580c';
}

// Splits long values (tokens, names) over several lines.
function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/(\s+)/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxWidth && line.trim()) {
      lines.push(line.trim());
      line = w.trimStart();
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trim());
  // Very long unbroken strings (e.g. references) — hard split.
  return lines.flatMap((l) => {
    if (ctx.measureText(l).width <= maxWidth) return [l];
    const parts = [];
    let cur = '';
    for (const ch of l) {
      if (ctx.measureText(cur + ch).width > maxWidth) {
        parts.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) parts.push(cur);
    return parts;
  });
}

/**
 * @param {{title: string, amount: number, status: string, rows: [string, string][], highlight?: {label: string, value: string}}} r
 * @returns {Promise<Blob>}
 */
export async function drawReceipt({ title, amount, status, rows, highlight, invite }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const labelW = 190;
  const valueW = W - PAD * 2 - labelW;

  // Measure height first.
  ctx.font = font(500, 22);
  const rowLines = rows.map(([, v]) => wrap(ctx, v ?? '', valueW));
  ctx.font = font(700, 30);
  const hlLines = highlight ? wrap(ctx, highlight.value, W - PAD * 2 - 40) : [];
  const INVITE_H = 230;
  const height = 250 + 150 + rowLines.reduce((s, l) => s + 22 + l.length * 30, 0) + (highlight ? 70 + hlLines.length * 40 : 0) + 130 + (invite ? INVITE_H + 20 : 0);
  const qrImg = invite ? await loadImage(await QRCode.toDataURL(invite.link, { margin: 1, width: 300, color: { dark: '#2a0b66', light: '#ffffff' }, errorCorrectionLevel: 'M' })).catch(() => null) : null;

  const scale = 2;
  canvas.width = W * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Background + header band.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, height);
  const g = ctx.createLinearGradient(0, 0, W, 150);
  g.addColorStop(0, '#9b5cff');
  g.addColorStop(0.6, '#6d2fd6');
  g.addColorStop(1, '#4b1aa8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 150);
  // Soft decorative circles.
  ctx.fillStyle = 'rgba(255,184,48,0.28)';
  ctx.beginPath(); ctx.arc(W - 40, 10, 120, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.arc(W - 170, 150, 70, 0, Math.PI * 2); ctx.fill();
  // Status icon in the header.
  const ok = /success|deliver|paid/i.test(String(status || ''));
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(W - PAD - 34, 75, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ok ? '#16a34a' : statusColor(status);
  ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ok) { ctx.moveTo(W - PAD - 50, 76); ctx.lineTo(W - PAD - 38, 88); ctx.lineTo(W - PAD - 16, 63); }
  else { ctx.moveTo(W - PAD - 34, 58); ctx.lineTo(W - PAD - 34, 80); ctx.moveTo(W - PAD - 34, 92); ctx.lineTo(W - PAD - 34, 93); }
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(800, 40);
  ctx.fillText('ZAPPI PAY', PAD, 72);
  ctx.font = font(500, 22);
  ctx.globalAlpha = 0.85;
  ctx.fillText(title || 'Transaction Receipt', PAD, 110);
  ctx.globalAlpha = 1;

  // Amount + status.
  let y = 230;
  ctx.fillStyle = '#0f172a';
  ctx.font = font(800, 52);
  ctx.fillText(money(amount), PAD, y);
  y += 48;
  const sc = statusColor(status);
  ctx.font = font(700, 22);
  const label = String(status || '').toUpperCase();
  const pillW = ctx.measureText(label).width + 36;
  ctx.fillStyle = `${sc}1f`;
  ctx.beginPath();
  ctx.roundRect(PAD, y - 26, pillW, 38, 19);
  ctx.fill();
  ctx.fillStyle = sc;
  ctx.fillText(label, PAD + 18, y);
  y += 50;

  // Highlighted value (e.g. electricity token).
  if (highlight) {
    const boxH = 50 + hlLines.length * 40;
    ctx.fillStyle = '#f5f3ff';
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - PAD * 2, boxH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b7280';
    ctx.font = font(600, 18);
    ctx.fillText(highlight.label.toUpperCase(), PAD + 20, y + 30);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(700, 30);
    hlLines.forEach((l, i) => ctx.fillText(l, PAD + 20, y + 68 + i * 40));
    y += boxH + 30;
  }

  // Detail rows.
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  rows.forEach(([k], i) => {
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 36;
    ctx.fillStyle = '#6b7280';
    ctx.font = font(500, 20);
    ctx.fillText(k, PAD, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(600, 22);
    rowLines[i].forEach((l, j) => {
      const w = ctx.measureText(l).width;
      ctx.fillText(l, W - PAD - w, y + j * 30);
    });
    y += (rowLines[i].length - 1) * 30 + 16;
  });

  // Invite box: the sender's referral link + QR code.
  if (invite) {
    const top = height - 130 - INVITE_H;
    ctx.fillStyle = '#f5f3ff';
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(PAD, top, W - PAD * 2, INVITE_H, 16);
    ctx.fill();
    ctx.stroke();
    const qr = 180;
    if (qrImg) ctx.drawImage(qrImg, W - PAD - 20 - qr, top + (INVITE_H - qr) / 2, qr, qr);
    const textW = W - PAD * 2 - qr - 60;
    ctx.fillStyle = PURPLE;
    ctx.font = font(800, 22);
    ctx.fillText(invite.code ? `🎁 Invited by @${invite.code}` : '🎁 Try ZAPPI PAY', PAD + 20, top + 40);
    ctx.fillStyle = '#0f172a';
    ctx.font = font(500, 19);
    const msg = wrap(ctx, invite.message, textW).slice(0, 3);
    msg.forEach((l, i) => ctx.fillText(l, PAD + 20, top + 74 + i * 26));
    ctx.fillStyle = PURPLE;
    ctx.font = font(700, 17);
    ctx.font = font(700, 16);
    wrap(ctx, invite.link.replace(/^https?:\/\/(www\.)?/, ''), textW).slice(0, 1).forEach((l) => ctx.fillText(l, PAD + 20, top + 84 + Math.min(msg.length, 3) * 26 + 6));
    if (invite.code) {
      ctx.fillStyle = '#6b7280';
      ctx.font = font(500, 16);
      ctx.fillText(`Referral code: ${invite.code}`, PAD + 20, top + INVITE_H - 22);
    }
  }

  // Footer with a ticket-style tear line.
  ctx.strokeStyle = '#d1d5db';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, height - 100); ctx.lineTo(W - PAD, height - 100); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = PURPLE;
  ctx.fillRect(0, height - 8, W, 8);
  y = height - 60;
  ctx.fillStyle = '#6b7280';
  ctx.font = font(500, 18);
  ctx.fillText('Thank you for using ZAPPI PAY · zappipay.com.ng', PAD, y);
  ctx.fillText('Support: support@zappipay.com.ng', PAD, y + 28);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

const SITE = 'https://www.zappipay.com.ng';
function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

// The sender's invite (admin can switch it off in Settings → Referrals).
let invitePromise = null;
export function receiptInvite() {
  if (!invitePromise) {
    invitePromise = getReceiptInvite()
      .then((d) => (d?.enabled ? { code: d.code || null, message: d.message, link: d.code ? `${SITE}/signup?ref=${encodeURIComponent(d.code)}` : SITE } : null))
      .catch(() => null);
    setTimeout(() => { invitePromise = null; }, 10 * 60 * 1000);
  }
  return invitePromise;
}
async function withInvite(receipt) {
  if (receipt.invite !== undefined) return receipt;
  return { ...receipt, invite: await receiptInvite() };
}

// Share the image (WhatsApp etc. on phones); falls back to downloading it.
export async function shareReceipt(receipt, fileName = 'zappipay-receipt.png') {
  const r = await withInvite(receipt);
  const blob = await drawReceipt(r);
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'ZAPPI PAY receipt', ...(r.invite ? { text: `${r.invite.message} ${r.invite.link}` } : {}) });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}

export async function downloadReceipt(receipt, fileName = 'zappipay-receipt.png') {
  downloadBlob(await drawReceipt(await withInvite(receipt)), fileName);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Electricity token / exam PINs from the VTpass response, if any.
export function extractToken(order) {
  // Tokens/PINs only once the order is confirmed (the server hides them too).
  if (order?.status !== 'SUCCESS') return null;
  const p = order?.responsePayload || {};
  const token = p.purchased_code || p.mainToken || p.token || p.Token || p.content?.transactions?.purchased_code;
  if (token) return String(token).replace(/^Token\s*:\s*/i, '').trim();
  const cards = p.cards || p.tokens;
  if (Array.isArray(cards) && cards.length) {
    return cards.map((c) => (typeof c === 'string' ? c : [c.Serial && `Serial ${c.Serial}`, c.Pin && `PIN ${c.Pin}`].filter(Boolean).join(' · '))).join('  |  ');
  }
  return null;
}

export { money as formatMoney };
