// Rule-based reply drafts for the admin Support page. detectCategory()
// guesses what a complaint is about from its wording and the linked
// order; draftReply() fills that category's template with the
// customer's name and order details. The admin always reviews and edits
// the draft before sending — nothing here is sent automatically.

export const CATEGORIES = [
  {
    id: 'failed_refunded',
    label: 'Failed purchase — already refunded',
    keywords: ['failed', 'debited', 'deducted', 'refund', 'money gone', 'charged'],
    orderStatus: ['FAILED', 'REFUNDED'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for reaching out, and we're sorry for the inconvenience. We've checked your ${c.service} order${c.orderBit} and it did not go through with the provider. The full amount of ${c.amount} was automatically refunded to your ZappiPay wallet, so your balance is intact.\n\nYou can try the purchase again at any time. If you notice any difference in your balance, please reply and we'll look into it right away.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'success_not_received',
    label: 'Shows successful but value not received',
    keywords: ['not received', 'not delivered', "didn't get", 'didnt get', 'did not get', 'no value', 'not reflect', 'not credited', 'no token', 'not working'],
    orderStatus: ['SUCCESS'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for letting us know, and we're sorry for the trouble. Our records show your ${c.service} order${c.orderBit} was confirmed as successful by the provider${c.refBit}.\n\nWe have escalated it to the provider to confirm delivery on their end. In the meantime, please check that the ${c.recipientLabel} ${c.recipient} is correct and, for airtime/data, dial your network's balance code.\n\nWe'll update you as soon as we hear back — usually within 24 hours.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'pending',
    label: 'Order still pending',
    keywords: ['pending', 'processing', 'waiting', 'taking long', 'delay'],
    orderStatus: ['PENDING'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for your patience. Your ${c.service} order${c.orderBit} is still being processed by the provider. Most orders complete within a few minutes; if it fails, the amount is refunded to your wallet automatically.\n\nWe're monitoring it and will update you shortly.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'funding',
    label: 'Wallet funding not credited',
    keywords: ['fund', 'funding', 'deposit', 'wallet not', 'not credited', 'transferred', 'sent money', 'bank alert', 'balance'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for reaching out. We verify every wallet funding request against our bank records before crediting it. We're checking your transfer now.\n\nTo help us find it faster, please confirm the exact amount, the sender's bank name and account name, and the transfer reference or a screenshot of your debit alert.\n\nOnce confirmed, your wallet will be credited and you'll receive a notification.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'wrong_number',
    label: 'Sent to wrong number / mistake',
    keywords: ['wrong number', 'mistake', 'mistakenly', 'wrong person', 'wrong meter', 'wrong smartcard', 'wrong account'],
    template: (c) =>
      `Hello ${c.name},\n\nWe understand how frustrating this is. Unfortunately, once a purchase is delivered to a number, the network does not allow us to reverse it.\n\nIf it was airtime, you can use our Airtime to Cash option in the app to convert it back to wallet cash (a small service fee applies). For other services, we'd advise contacting the recipient directly.\n\nPlease double-check the recipient before paying in future — tapping Verify on meter and smartcard numbers helps confirm the name first.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'airtime_cash',
    label: 'Airtime to Cash query',
    keywords: ['airtime to cash', 'convert', 'share and sell', 'share n sell'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for your Airtime to Cash request. We confirm each one manually once the airtime arrives on our line. If you've already transferred it, please reply with the time you sent it and the number you sent from, and we'll check immediately.\n\nOnce confirmed, the payout will be added to your wallet and you'll be notified.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'account',
    label: 'Login / password / account',
    keywords: ['login', 'log in', 'password', 'locked', 'account', 'blocked', 'deactivated', 'cannot access', "can't access", 'username'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for contacting us. For your security, we'll never ask for your password. Please confirm the phone number registered on your account and we'll help you regain access.\n\nIf you can still log in, you can change your password any time under Profile → Change Password.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'bank_transfer',
    label: 'Bank transfer / withdrawal / BVN',
    keywords: ['withdraw', 'bank account', 'cash out', 'bvn', 'nin', 'to my bank'],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for your interest. Sending money to bank accounts and BVN/NIN verification are coming soon — we're completing approval with our payment partner. We'll announce it in the app as soon as it's live.\n\nIn the meantime, you can send money instantly to any ZappiPay user from Send Money.\n\nKind regards,\nZappiPay Support`,
  },
  {
    id: 'general',
    label: 'General / other',
    keywords: [],
    template: (c) =>
      `Hello ${c.name},\n\nThank you for reaching out to ZappiPay. We've received your message and we're looking into it.\n\n[Add your answer here]\n\nIf there's anything else we can help with, just reply to this message.\n\nKind regards,\nZappiPay Support`,
  },
];

const RECIPIENT_LABELS = {
  AIRTIME: 'phone number',
  DATA: 'phone number',
  ELECTRICITY: 'meter number',
  CABLE: 'smartcard number',
  EDUCATION: 'profile ID',
  INTERNET: 'account ID',
  BETTING: 'betting account ID',
};

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function serviceName(s) {
  return s ? s.charAt(0) + s.slice(1).toLowerCase() : 'order';
}

export function detectCategory(ticket) {
  const text = ` ${String(ticket.message || '').toLowerCase()} `;
  const orderStatus = ticket.order?.status;
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) if (text.includes(kw)) score += kw.includes(' ') ? 2 : 1;
    // A linked order's status is a strong hint for the order categories.
    if (orderStatus && cat.orderStatus?.includes(orderStatus)) score += 2;
    if (cat.orderStatus && !ticket.order) score -= 1;
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best?.id || 'general';
}

export function draftReply(ticket, categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  const o = ticket.order;
  const ctx = {
    name: ticket.customer?.name?.split(' ')[0] || 'there',
    service: o ? serviceName(o.service) : 'purchase',
    amount: o ? naira(o.amount) : 'the amount',
    recipient: o?.recipient || '',
    recipientLabel: (o && RECIPIENT_LABELS[o.service]) || 'recipient',
    orderBit: o ? ` of ${naira(o.amount)} to ${o.recipient} on ${fmtDate(o.createdAt)}` : '',
    refBit: o?.vtpassRequestId ? ` (reference ${o.vtpassRequestId})` : '',
  };
  return cat.template(ctx);
}
