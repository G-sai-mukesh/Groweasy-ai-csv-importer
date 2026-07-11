export function LogoMark({ className, id = "logo-mark" }: { className?: string; id?: string }) {
  const clipId = `${id}-clip`;
  return (
    <svg viewBox="0 0 212 212" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g clipPath={`url(#${clipId})`}>
        <path d="M153.512 102.25L28.3282 227.434L-11.2302 187.876L113.953 62.6921L153.512 102.25Z" fill="currentColor" />
        <path d="M40.5302 62.6965H153.503V102.257H40.5302V62.6965Z" fill="currentColor" />
        <path d="M153.503 62.6965V175.67H113.942L113.942 62.6965L153.503 62.6965Z" fill="currentColor" />
        <path d="M153.503 62.6965V175.67H113.95V62.6963L153.503 62.6965Z" fill="currentColor" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="212" height="212" rx="48" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
