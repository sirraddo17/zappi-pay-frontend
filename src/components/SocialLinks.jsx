// "Follow us" links. Shown on the profile page and the landing page.
export const SOCIAL = [
  { key: 'x', label: 'X (Twitter)', handle: '@zappi_pay', url: 'https://x.com/zappi_pay', bg: '#000', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  ) },
  { key: 'ig', label: 'Instagram', handle: '@zappi_pay', url: 'https://www.instagram.com/zappi_pay', bg: 'linear-gradient(45deg, #f09433, #dc2743 50%, #bc1888)', icon: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" /></svg>
  ) },
];

export default function SocialLinks({ compact = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {SOCIAL.map((s) => (
        <a
          key={s.key}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow ZAPPI PAY on ${s.label}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: compact ? 8 : '8px 14px', borderRadius: 999, background: s.bg, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
        >
          {s.icon}
          {!compact && <span>{s.handle}</span>}
        </a>
      ))}
    </div>
  );
}
