// Three drawn icons, one stroke weight (1.75) on a 20px grid.
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
