import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { CATEGORY_INFO, CATEGORY_ORDER, gamesInCategory, type GameType } from '@arena/shared';

/** Accessible radio-card group for choosing the first game, grouped by category. */
export function GamePicker({
  value,
  registration,
}: {
  value: GameType;
  registration: UseFormRegisterReturn;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink">Start with</legend>
      <p className="mb-4 text-xs text-ink-muted">
        Just a starting point. Switch games anytime inside the room.
      </p>
      <div className="space-y-5">
        {CATEGORY_ORDER.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
              {CATEGORY_INFO[cat].emoji} {CATEGORY_INFO[cat].title}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {gamesInCategory(cat).map((game) => {
                const selected = value === game.id;
                return (
                  <label
                    key={game.id}
                    className={clsx(
                      'relative flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 transition focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2',
                      selected
                        ? 'border-brand-400 shadow-glow'
                        : 'border-line hover:border-brand-200',
                    )}
                  >
                    <input type="radio" value={game.id} className="sr-only" {...registration} />
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-2xl"
                      aria-hidden="true"
                    >
                      {game.emoji}
                    </span>
                    <span className="min-w-0 flex-1 pr-6">
                      <span className="block font-bold leading-tight">{game.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {game.tagline} · {game.duration}
                      </span>
                    </span>
                    <CheckCircle2
                      className={clsx(
                        'absolute right-3 top-3 h-5 w-5 transition',
                        selected ? 'text-brand-600' : 'text-transparent',
                      )}
                      aria-hidden="true"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
