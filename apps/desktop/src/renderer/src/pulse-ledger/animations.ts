/** Primary 12-column responsive dashboard grid (Tailwind class string). */
export const contentGridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12 lg:gap-6';

/** Shared interaction / motion class fragments (Tailwind). */
export const cardHoverClass =
  'pl-premium-card transition-[box-shadow,border-color,transform] duration-200 ease-out';

export const buttonTransitionClass = 'transition-all duration-200 ease-out';

/** Matches `.pl-tab-panel` staggered entrance in `pulseledger.css`. */
export const fadeInClass = 'pl-tab-panel';

/** Active tab / strong focus ring + soft glow (use with `ring-1` context). */
export const activeGlowClass =
  'ring-pl-teal/40 shadow-[0_0_28px_-14px_rgba(45,212,191,0.45)]';
