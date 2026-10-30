interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

// CSS/SVG FILM BAZ logo placeholder — easily replaceable with the approved
// final logo asset in a future phase.
export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const dims = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;

  return (
    <div className={`flex items-center gap-2.5 ${className}`} dir="rtl">
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 64 64"
        className="flex-shrink-0 drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)]"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="#0d1320" stroke="#d4af37" strokeWidth="1.5" />
        {/* film perforations */}
        <circle cx="14" cy="24" r="2.8" fill="#e8853a" />
        <circle cx="14" cy="32" r="2.8" fill="#e8853a" />
        <circle cx="14" cy="40" r="2.8" fill="#e8853a" />
        <circle cx="50" cy="24" r="2.8" fill="#e8853a" />
        <circle cx="50" cy="32" r="2.8" fill="#e8853a" />
        <circle cx="50" cy="40" r="2.8" fill="#e8853a" />
        {/* play triangle */}
        <path d="M27 25.5v13l11-6.5z" fill="#f0c75e" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-gold-gradient text-lg font-extrabold tracking-tight">فیلم باز</span>
          <span className="text-[10px] font-semibold tracking-[0.25em] text-text-muted" style={{ color: '#8a93a6' }}>
            FILM BAZ
          </span>
        </div>
      )}
    </div>
  );
}
