import { SERVICE_LABEL } from './repeat';
import { WHATSAPP_NUMBER } from '../assistant/knowledge';

const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

// One line about an order, so support can find it without asking.
export function orderLine(o) {
  if (!o) return '';
  const what = SERVICE_LABEL[o.service] || o.service || 'Order';
  const ref = o.vtpassRequestId || o.id;
  return `${what} ₦${Number(o.amount || 0).toLocaleString()}${o.recipient ? ` to ${o.recipient}` : ''} · ${when(o.createdAt)} · ${o.status || ''}${ref ? ` · Ref ${ref}` : ''}`;
}

// wa.me link to support with the customer's details already filled in,
// so the first WhatsApp message has everything (fewer back-and-forths).
export function supportWaLink({ number, customer, order, topic, message } = {}) {
  const lines = ['Hello ZAPPI PAY, I need help.'];
  if (customer) {
    lines.push(`Name: ${customer.name || ''}`);
    if (customer.phone) lines.push(`Account phone: ${customer.phone}`);
    if (customer.username) lines.push(`Username: @${customer.username}`);
  }
  if (topic) lines.push(`Topic: ${topic}`);
  if (order) lines.push(`Order: ${orderLine(order)}`);
  lines.push(`Problem: ${String(message || '').trim().slice(0, 600) || '…'}`);
  const to = String(number || WHATSAPP_NUMBER).replace(/\D/g, '').replace(/^0/, '234');
  return `https://wa.me/${to}?text=${encodeURIComponent(lines.join('\n'))}`;
}
