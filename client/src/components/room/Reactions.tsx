import { REACTIONS, type ReactionEmoji, type ReactionEvent } from '@arena/shared';

export function ReactionBar({
  onReact,
  disabled,
}: {
  onReact: (emoji: ReactionEmoji) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5"
      role="group"
      aria-label="Send a reaction"
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          onClick={() => onReact(emoji)}
          aria-label={`Send ${emoji} reaction`}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-white text-lg shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card active:scale-90 disabled:opacity-40"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Emoji that float up over the board, then remove themselves. */
export function FloatingReactions({
  reactions,
  myPlayerId,
  onDone,
}: {
  reactions: ReactionEvent[];
  myPlayerId: string | null;
  onDone: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {reactions.map((r, i) => (
        <span
          key={r.id}
          onAnimationEnd={() => onDone(r.id)}
          className="absolute bottom-6 animate-float-up text-4xl drop-shadow"
          style={{ left: `${r.playerId === myPlayerId ? 20 + (i % 3) * 8 : 62 + (i % 3) * 8}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
