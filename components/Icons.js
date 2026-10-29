// Line icons on a 20px grid, one stroke weight (1.75), round caps and joins.
// Add new icons here and keep to that weight; they inherit colour from currentColor.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function DocIcon() {
  return (
    <svg {...base}>
      <path d="M5 2.5h6.5L15.5 6.5v10a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M11.5 2.5v4h4" />
      <path d="M7 11h6M7 14h4" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...base}>
      <path d="M10 3 18 16.5H2L10 3Z" />
      <path d="M10 8.5v3.5M10 14.25v.01" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m6.75 10.25 2.25 2.25 4.25-4.5" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...base}>
      <path d="M10 13V3.5M6.25 7.25 10 3.5l3.75 3.75" />
      <path d="M3.5 12.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...base}>
      <path d="M3.5 5.5h13M8 5.5v-2h4v2" />
      <path d="M5 5.5l.75 10.25a1 1 0 0 0 1 .92h6.5a1 1 0 0 0 1-.92L15 5.5" />
      <path d="M8.5 9v4.5M11.5 9v4.5" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...base}>
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg {...base}>
      <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...base}>
      <path d="M16 10H4M8.5 5.5 4 10l4.5 4.5" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg {...base}>
      <path d="M10 16.5v-13M5.5 8 10 3.5 14.5 8" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg {...base}>
      <rect x="5" y="5" width="10" height="10" rx="2" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg {...base}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
      <path d="M12.5 7.5v-3a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg {...base}>
      <path d="M8.5 4.5h-4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" />
      <path d="M12 3.5h4.5V8M16.5 3.5 9.5 10.5" />
    </svg>
  );
}

// The Margin mark: a tile of ink with a cursive M (the Dancing Script SemiBold glyph,
// converted to a path so it never depends on a font loading). Colours come from CSS
// tokens so it follows the light and dark themes. (app/icon.svg is the same drawing
// with fixed colours for the browser tab.)
export function LogoMark({ size = 28 }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" className="logo-tile" />
      <path d="M5.79 26.5Q5.93 26.12 6.59 24.67Q7.25 23.23 8.35 20.85Q9.45 18.46 10.91 15.28Q12.37 12.09 14.11 8.24Q14.21 8.04 14.28 7.79Q14.35 7.53 14.35 7.31Q14.35 7.04 14.19 6.87Q14.03 6.7 13.56 6.7Q12.46 6.7 11.76 7.39Q11.07 8.08 10.73 9.09Q10.4 10.1 10.4 11.08Q10.4 11.32 10.42 11.59Q10.44 11.86 10.48 12.18Q9.9 12.18 9.54 11.81Q9.17 11.44 8.98 10.9Q8.8 10.36 8.8 9.89Q8.8 9.05 9.27 8.27Q9.75 7.49 10.52 6.85Q11.28 6.22 12.22 5.86Q13.15 5.5 14.06 5.5Q14.99 5.5 15.63 6.02Q16.28 6.53 16.62 7.88Q16.96 9.22 16.96 11.74Q16.96 13.41 16.84 15.17Q16.73 16.93 16.6 18.53Q16.47 20.12 16.45 21.32Q16.93 19.77 17.7 18.02Q18.47 16.27 19.37 14.53Q20.27 12.8 21.14 11.28Q22.02 9.75 22.72 8.61Q23.42 7.48 23.78 6.94Q24.14 6.38 24.42 6.1Q24.7 5.82 25.17 5.82Q25.53 5.82 26.21 6.07Q25.99 6.56 25.67 7.58Q25.36 8.61 25 10.01Q24.6 11.58 24.2 13.49Q23.8 15.4 23.48 17.37Q23.15 19.33 22.95 21.08Q22.75 22.83 22.75 24.11Q22.75 24.75 22.81 25.11Q22.87 25.48 22.98 25.76Q23.09 26.04 23.23 26.5Q22.19 26.5 21.64 26.18Q21.1 25.86 20.92 25.15Q20.73 24.45 20.73 23.28Q20.73 20.32 21.44 17.01Q22.15 13.69 23.08 10.16Q22.34 11.17 21.55 12.62Q20.75 14.06 19.98 15.69Q19.2 17.32 18.5 18.92Q17.8 20.52 17.26 21.88Q16.73 23.25 16.43 24.16Q16.22 24.23 16.15 24.25Q16.07 24.28 15.94 24.28Q15.1 24.28 14.86 23.27Q14.62 22.25 14.62 20.47Q14.62 19.44 14.66 18.17Q14.7 16.91 14.76 15.58Q14.82 14.25 14.86 12.97Q14.9 11.69 14.9 10.61Q14.9 10.18 14.89 9.8Q14.87 9.43 14.87 9.1Q12.85 13.79 11.47 17.11Q10.09 20.43 9.14 22.5Q8.18 24.57 7.4 25.54Q6.62 26.5 5.79 26.5Z" className="logo-m" />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg {...base}>
      <path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6" />
      <circle cx="11.5" cy="6" r="2" />
      <circle cx="8.5" cy="14" r="2" />
    </svg>
  );
}
