import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CATEGORY_INFO, CATEGORY_ORDER, gamesInCategory, type GameType } from '@arena/shared';

/** Compact, categorized list of every game. */
export function GameGrid({
  current,
  onPick,
  disabled,
}: {
  current?: GameType;
  onPick: (gameType: GameType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} aria-labelledby={`cat-${cat}`}>
          <h3
            id={`cat-${cat}`}
            className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted"
          >
            {CATEGORY_INFO[cat].emoji} {CATEGORY_INFO[cat].title}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gamesInCategory(cat).map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={disabled}
                data-game={g.id}
                onClick={() => onPick(g.id)}
                className={clsx(
                  'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition disabled:opacity-50',
                  g.id === current
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-line bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card',
                )}
              >
                <span className="text-lg" aria-hidden="true">
                  {g.emoji}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate">{g.name}</span>
                  {g.id === current && (
                    <span className="text-[10px] font-bold uppercase text-brand-600">Current</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Bottom sheet / modal wrapping GameGrid. */
export function GameMenuSheet({
  open,
  title,
  note,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  note: string;
  current?: GameType;
  onPick: (gameType: GameType) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        className="relative max-h-[88vh] w-full max-w-2xl animate-fade-up overflow-y-auto rounded-t-4xl border border-line bg-white p-5 shadow-lift sm:rounded-4xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="game-menu-title" className="text-lg font-extrabold">
              {title}
            </h2>
            <p className="text-sm text-ink-muted">{note}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <GameGrid
          current={current}
          onPick={(g) => {
            onPick(g);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
