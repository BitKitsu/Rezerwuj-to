function LogoIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M10 10h6v2h-4v3h3v2h-3v5h-2zM18 10h2l4 12h-2.1l-0.9-3h-3l-0.9 3h-2.1zm1.2 7h2.6l-1.3-4.3z"
        fill="white"
      />
    </svg>
  );
}

export default LogoIcon;
