// Small inline icons (no icon library). Decorative: hidden from screen readers; the text next to them carries the meaning.
const base = {
  width: '1.25em', height: '1.25em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false',
}

export const IconCheck = (p) => <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
export const IconAlert = (p) => (
  <svg {...base} {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
)
export const IconInfo = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
export const IconSnow = (p) => (
  <svg {...base} {...p}><path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7M9 4l3 2 3-2M9 20l3-2 3 2" /></svg>
)
export const IconCart = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6" /></svg>
)
export const IconPot = (p) => (
  <svg {...base} {...p}><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" /></svg>
)
export const IconFlame = (p) => (
  <svg {...base} {...p}><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" /></svg>
)
export const IconWallet = (p) => (
  <svg {...base} {...p}><path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" /><path d="M3 7V6a2 2 0 0 1 2-2h11" /><circle cx="16.5" cy="13.5" r="1" /></svg>
)
export const IconMuscle = (p) => (
  <svg {...base} {...p}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></svg>
)
export const IconRefresh = (p) => (
  <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></svg>
)
export const IconLock = (p) => (
  <svg {...base} {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
)
export const IconBowl = (p) => (
  <svg {...base} {...p}><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 7c0-1.5 1.5-1.5 1.5-3M13 7c0-1.5 1.5-1.5 1.5-3" /></svg>
)
