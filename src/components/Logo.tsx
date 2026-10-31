interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  // Keep the existing dimensions so the header layout does not shift.
  const dims = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;
  const iconId = `film-baz-icon-${size}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`} dir="rtl">
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 64 64"
        className="flex-shrink-0 drop-shadow-[0_3px_9px_rgba(190,18,60,0.32)]"
        role="img"
        aria-label="لوگوی فیلم باز"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${iconId}-shell`} x1="8" y1="4" x2="56" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#292126" />
            <stop offset="0.48" stopColor="#100d11" />
            <stop offset="1" stopColor="#050506" />
          </linearGradient>
          <linearGradient id={`${iconId}-rim`} x1="8" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff8295" />
            <stop offset="0.42" stopColor="#e11d48" />
            <stop offset="1" stopColor="#701329" />
          </linearGradient>
          <linearGradient id={`${iconId}-play`} x1="26" y1="21" x2="43" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff1f3" />
            <stop offset="0.52" stopColor="#ff647f" />
            <stop offset="1" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id={`${iconId}-gloss`} x1="32" y1="3" x2="32" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rounded, beveled app-icon shell */}
        <rect x="1.5" y="1.5" width="61" height="61" rx="15" fill={`url(#${iconId}-shell)`} stroke={`url(#${iconId}-rim)`} strokeWidth="2" />
        <rect x="5" y="5" width="54" height="54" rx="11.5" fill="#0b090b" stroke="#ffffff" strokeOpacity="0.12" />
        <path d="M7 16.5C7 10.98 11.48 6.5 17 6.5h30c5.52 0 10 4.48 10 10v8H7v-8Z" fill={`url(#${iconId}-gloss)`} />

        {/* Film frame */}
        <rect x="13" y="16" width="38" height="32" rx="5.5" fill="#181116" stroke={`url(#${iconId}-rim)`} strokeWidth="1.6" />
        <path d="M18 16v32M46 16v32" stroke="#ff647f" strokeOpacity="0.75" strokeWidth="1.6" />
        <g fill="#ff8a9d">
          <rect x="14.8" y="20" width="2.2" height="4.2" rx="0.8" />
          <rect x="14.8" y="29.9" width="2.2" height="4.2" rx="0.8" />
          <rect x="14.8" y="39.8" width="2.2" height="4.2" rx="0.8" />
          <rect x="47" y="20" width="2.2" height="4.2" rx="0.8" />
          <rect x="47" y="29.9" width="2.2" height="4.2" rx="0.8" />
          <rect x="47" y="39.8" width="2.2" height="4.2" rx="0.8" />
        </g>
        <path d="M27 23.5c0-1.15 1.25-1.86 2.24-1.27l13.08 7.77a2.33 2.33 0 0 1 0 4l-13.08 7.77c-.99.59-2.24-.12-2.24-1.27V23.5Z" fill={`url(#${iconId}-play)`} stroke="#ffd2da" strokeOpacity="0.55" strokeWidth="0.8" />
        <path d="M5.5 17.5C7.5 8.9 14.2 5.5 22 5.5" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-gold-gradient text-lg font-extrabold tracking-tight">فیلم باز</span>
          <span className="mt-1 text-[10px] font-semibold tracking-[0.25em] text-text-muted">
            FILM BAZ
          </span>
        </div>
      )}
    </div>
  );
}
