// Home shows 8 tiles: up to 7 services + More. When some services are
// switched off (Send Money, Bet Funding), a service from More fills the
// gap so More stays in the last spot; it goes back to More when the gap
// closes. More hides whatever is already on Home.
export const HOME_SLOTS = 7;

// In order of preference. `on` decides whether it can be used right now.
export const FILLERS = [
  { slug: 'print-cards', to: '/print-cards', label: 'Print Cards', on: (feat, info) => Boolean(info?.printCards) },
  { slug: 'bulk', to: '/bulk', label: 'Bulk Top-up', on: () => true },
  { slug: 'deals', to: '/deals', label: 'Data Deals', on: () => true },
];

export function homeServices(core, feat, info) {
  const main = core.filter((s) => (s.slug !== 'transfer' || feat.sendMoney || info?.bankTransfer) && (s.slug !== 'betting' || feat.betFunding));
  const room = Math.max(0, HOME_SLOTS - main.length);
  const fillers = FILLERS.filter((f) => f.on(feat, info)).slice(0, room);
  return { tiles: [...main.slice(0, HOME_SLOTS), ...fillers], onHome: fillers.map((f) => f.to) };
}
