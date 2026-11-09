import clsx from 'clsx';
import { Plus, Ticket, Volume2, VolumeX } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePrefsStore } from '../../store/prefsStore';
import { Logo } from '../common/Logo';

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  );

/** Minimal header: no accounts, just quick actions and the player's chosen name. */
export function Header() {
  const name = useAuthStore((s) => s.profile?.displayName);
  const { soundOn, toggleSound } = usePrefsStore();

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/create" className={navClass} aria-label="Create a room">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Create room</span>
          </NavLink>
          <NavLink to="/join" className={navClass} aria-label="Join a room">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Join</span>
          </NavLink>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition hover:bg-ink/5 hover:text-ink"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {name && (
            <span
              className="ml-1 flex h-9 items-center gap-2 rounded-2xl border border-line bg-white pl-1 pr-3 text-sm font-semibold shadow-sm"
              title="Your display name"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
                {name[0]?.toUpperCase()}
              </span>
              <span className="hidden max-w-[110px] truncate sm:block">{name}</span>
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
