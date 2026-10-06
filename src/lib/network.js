// Works out the mobile network from a Nigerian number's prefix, so the
// Airtime / Data screens can pick it for the customer. Numbers can be
// ported, so the customer can always change it.
const PREFIXES = {
  mtn: ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916', '07025', '07026', '0704'],
  airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0911', '0912'],
  glo: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  etisalat: ['0809', '0817', '0818', '0908', '0909'],
};
export const NETWORK_STYLE = {
  mtn: { name: 'MTN', bg: '#ffcc00', fg: '#1a1300' },
  airtel: { name: 'Airtel', bg: '#e40000', fg: '#fff' },
  glo: { name: 'Glo', bg: '#0b9d3e', fg: '#fff' },
  etisalat: { name: '9mobile', bg: '#006e3c', fg: '#fff' },
};

export function localNumber(input) {
  let n = String(input || '').replace(/\D/g, '');
  if (n.startsWith('234') && n.length >= 13) n = `0${n.slice(3)}`;
  else if (n.length === 10 && /^[789]/.test(n)) n = `0${n}`;
  return n;
}

export function detectNetwork(input) {
  const n = localNumber(input);
  if (n.length < 4) return null;
  for (const [net, list] of Object.entries(PREFIXES)) {
    if (list.some((p) => n.startsWith(p))) return net;
  }
  return null;
}

// Which network a VTpass provider belongs to (mtn, mtn-data, glo-sme-data, etisalat-data, 9mobile…).
export function networkOf(serviceID) {
  const id = String(serviceID || '').toLowerCase();
  if (id.startsWith('mtn')) return 'mtn';
  if (id.startsWith('airtel')) return 'airtel';
  if (id.startsWith('glo')) return 'glo';
  if (id.startsWith('etisalat') || id.startsWith('9mobile') || id.startsWith('t2')) return 'etisalat';
  return null;
}

// Android Chrome can open the phone's contact list.
export const canPickContact = () => typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;
export async function pickContactNumber() {
  const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
  const tel = c?.tel?.find((t) => detectNetwork(t)) || c?.tel?.[0];
  return tel ? { number: localNumber(tel), name: c?.name?.[0] || '' } : null;
}
