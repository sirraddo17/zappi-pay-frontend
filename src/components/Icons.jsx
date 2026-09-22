// Small flat-line SVG icons, sized via `size` and colored via
// `color` (defaults to currentColor so they inherit from CSS where
// convenient). Kept in one file since each is only used in a
// handful of places (service tiles, bottom nav, header bell).

const base = (size) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' });

export function PhoneIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M6.6 10.8c1.3 2.6 3.4 4.7 6 6l2-2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4.9c0-.6.4-1 1-1h3.7c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2 2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WifiIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M2 8.5a15.9 15.9 0 0 1 20 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.5 12.5a10.9 10.9 0 0 1 13 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 16.5a5.6 5.6 0 0 1 6 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1.3" fill={color} />
    </svg>
  );
}

export function BoltIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill={color} />
    </svg>
  );
}

export function TvIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M8 21h8M12 18v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CapIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M12 4 2 9l10 5 10-5-10-5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M3 9 12 4l9 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="10" width="16" height="9" rx="1" stroke={color} strokeWidth="1.8" />
      <path d="M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 19h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M4 11 12 4l8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19v-5h4v5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M3 10h18" stroke={color} strokeWidth="1.8" />
      <circle cx="16.5" cy="14" r="1.2" fill={color} />
    </svg>
  );
}

export function ReceiptIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FundIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
