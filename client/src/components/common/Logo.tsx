import { Link } from 'react-router-dom';
import { config } from '../../lib/config';

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#6C5CF5" />
      <rect width="64" height="64" rx="18" fill="url(#logo-shine)" />
      <path d="M15 15l14 14M29 15L15 29" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="43" cy="43" r="8" fill="none" stroke="#fff" strokeWidth="5.5" />
      <circle cx="44" cy="21" r="3.5" fill="#C9C2FF" />
      <circle cx="21" cy="44" r="3.5" fill="#C9C2FF" />
      <defs>
        <linearGradient id="logo-shine" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo() {
  const [first, ...rest] = config.appName.split(' ');
  return (
    <Link
      to="/"
      className="group flex items-center gap-2.5 rounded-xl"
      aria-label={`${config.appName} home`}
    >
      <LogoMark className="h-9 w-9 transition group-hover:rotate-[-6deg]" />
      <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-ink sm:text-lg">
        {first}
        {rest.length > 0 && <span className="text-brand-600"> {rest.join(' ')}</span>}
      </span>
    </Link>
  );
}
