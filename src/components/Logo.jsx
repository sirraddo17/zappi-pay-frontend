// The app icon as inline SVG (so it scales perfectly at any size,
// unlike an <img> raster) plus the "Zappi" + "Pay" wordmark, sized
// and colored per the brand spec. Used in the Dashboard header, the
// Login screen, and anywhere else the logo needs to appear — the
// same source as public/icon.svg (the favicon), just inlined here
// so its fill colors can be reused directly in JSX.

export function LogoIcon({ size = 40 }) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} aria-hidden="true">
      <rect x="50" y="50" width="300" height="300" rx="72" fill="#863bff" />
      <rect x="100" y="118" width="200" height="36" rx="8" fill="white" />
      <polygon points="280,154 120,234 164,234 324,154" fill="white" />
      <rect x="100" y="234" width="200" height="36" rx="8" fill="white" />
      <polygon points="286,62 268,108 282,108 260,158 308,98 292,98" fill="#FFB830" />
    </svg>
  );
}

export function Wordmark({ size = 20 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ color: '#fff' }}>Zappi</span>
      <span style={{ color: '#FFB830', marginLeft: 4 }}>Pay</span>
    </span>
  );
}

export default function Logo({ iconSize = 40, wordmarkSize = 20, gap = 10 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <LogoIcon size={iconSize} />
      <Wordmark size={wordmarkSize} />
    </div>
  );
}
