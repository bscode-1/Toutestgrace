// src/components/Logo.tsx — TIMS B logo (mark + optional name). Works in light and dark mode.
type LogoProps = {
  size?: number;        // height of the mark in px
  showName?: boolean;   // show "TIMS B" next to the mark
  className?: string;
  nameClassName?: string;
};

export default function Logo({
  size = 36,
  showName = true,
  className = "",
  nameClassName = "",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="TIMS B">
        <rect width="64" height="64" rx="14" fill="#0B4F5C" />
        <path
          fill="#F7F8F6"
          fillRule="evenodd"
          d="M20 12 H35 C42 12 46 15.5 46 21 C46 24.5 44.3 27 41.5 28.3 C45 29.6 47 32.5 47 36.5 C47 42.5 42.5 46 35.5 46 H20 Z M27 18 V25.5 H34 C37 25.5 39 24.2 39 21.7 C39 19.2 37 18 34 18 Z M27 31.5 V40 H35 C38.5 40 40.5 38.5 40.5 35.8 C40.5 33 38.5 31.5 35 31.5 Z"
        />
        <path
          d="M20 53 H44 M39.5 48.5 L44.5 53 L39.5 57.5"
          fill="none"
          stroke="#F2A93B"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showName && (
        <span className={`font-extrabold tracking-wide ${nameClassName}`}>TIMS B</span>
      )}
    </span>
  );
}
