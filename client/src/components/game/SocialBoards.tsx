import clsx from 'clsx';
import { Check, Lock } from 'lucide-react';
import {
  HIDDEN_CHOICE,
  RPS_CHOICES,
  currentQuestion,
  quizBank,
  quizSubject,
  type Mark as MarkType,
  type MemoryExt,
  type QuizExt,
  type RpsExt,
} from '@arena/shared';
import { Mark } from './Mark';
import type { BoardProps } from './types';

const other = (m: MarkType): MarkType => (m === 'X' ? 'O' : 'X');

function LockedIn({ name }: { name: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Check className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-bold">Locked in!</p>
      <p className="text-sm text-ink-muted">Waiting for {name}… answers reveal together.</p>
    </div>
  );
}

function PartnerStatus({ locked, name }: { locked: boolean; name: string }) {
  return (
    <p
      className={clsx(
        'flex items-center justify-center gap-1.5 text-xs font-semibold',
        locked ? 'text-emerald-700' : 'text-ink-muted',
      )}
    >
      {locked ? (
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
      )}
      {locked ? `${name} has locked in` : `${name} is choosing…`}
    </p>
  );
}

/* ------------------------------ rock paper scissors ------------------------------ */

export function RpsBoard({ game, myMark, interactive, onMove, names }: BoardProps) {
  const ext = game.ext as RpsExt;
  const me = myMark ?? 'X';
  const opp = other(me);
  const last = ext.history[ext.history.length - 1];
  const locked = ext.picks[me] !== null && ext.picks[me] !== HIDDEN_CHOICE;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {last && (
        <div className="card animate-fade-up p-4" aria-live="polite">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
            Throw {ext.history.length}
          </p>
          <div className="flex items-center justify-around">
            {[me, opp].map((m) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <span
                  className={clsx(
                    'flex h-16 w-16 items-center justify-center rounded-2xl text-4xl',
                    m === 'X' ? 'bg-xmark-light' : 'bg-omark-light',
                    last.winner === m && 'ring-4 ring-emerald-300',
                  )}
                >
                  {RPS_CHOICES[last[m]]!.emoji}
                </span>
                <span className="text-xs font-semibold">{m === me ? 'You' : names[m]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-sm font-bold">
            {last.winner === null
              ? 'Tie! Go again.'
              : last.winner === me
                ? 'You take it! 🎉'
                : `${names[opp]} takes it.`}
          </p>
        </div>
      )}

      {game.status === 'IN_PROGRESS' &&
        (locked || !interactive ? (
          <div className="card p-4">
            {locked ? (
              <LockedIn name={names[opp]} />
            ) : (
              <PartnerStatus locked={false} name={names[opp]} />
            )}
          </div>
        ) : (
          <div className="card p-5">
            <p className="mb-4 text-center font-bold">Pick your throw</p>
            <div
              className="grid grid-cols-3 gap-3"
              role="group"
              aria-label="Choose rock, paper or scissors"
            >
              {RPS_CHOICES.map((choice, i) => (
                <button
                  key={choice.label}
                  type="button"
                  data-choice={i}
                  onClick={() => onMove(i)}
                  className="flex flex-col items-center gap-1 rounded-3xl border border-line bg-white py-4 text-5xl shadow-sm transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-card active:scale-95"
                >
                  <span aria-hidden="true">{choice.emoji}</span>
                  <span className="text-sm font-bold text-ink">{choice.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <PartnerStatus locked={ext.picks[opp] !== null} name={names[opp]} />
            </div>
          </div>
        ))}

      <p className="text-center text-xs text-ink-muted">First to {ext.target} wins · ties replay</p>
    </div>
  );
}

/* ------------------------------ know-me & in-sync ------------------------------ */

export function QuizBoard({ game, myMark, interactive, onMove, names }: BoardProps) {
  const ext = game.ext as QuizExt;
  const me = myMark ?? 'X';
  const opp = other(me);
  const question = currentQuestion(ext);
  const subject = quizSubject(ext);
  const locked = ext.answers[me] !== null && ext.answers[me] !== HIDDEN_CHOICE;
  const last = ext.history[ext.history.length - 1];
  const lastQuestion = last ? quizBank(ext.mode)[last.qid] : null;

  let prompt = 'Pick the one that is more you';
  if (subject === me) prompt = 'You’re in the spotlight: answer honestly about yourself';
  else if (subject === opp) prompt = `Guess what ${names[opp]} picked`;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div
        className="flex justify-center gap-1.5"
        aria-label={`Question ${Math.min(ext.q + 1, ext.questions.length)} of ${ext.questions.length}`}
      >
        {ext.questions.map((_, i) => {
          const h = ext.history[i];
          return (
            <span
              key={i}
              className={clsx(
                'h-2 w-6 rounded-full transition',
                h
                  ? h.match
                    ? 'bg-emerald-400'
                    : 'bg-xmark/50'
                  : i === ext.q
                    ? 'bg-brand-500'
                    : 'bg-ink/10',
              )}
            />
          );
        })}
      </div>

      {last && lastQuestion && (
        <div className="card animate-fade-up p-4" aria-live="polite">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
            {last.match
              ? ext.mode === 'in-sync'
                ? '✨ In sync!'
                : '🎯 Nailed it!'
              : '🙈 Not quite'}
          </p>
          <p className="mt-1 text-center text-sm font-semibold">{lastQuestion.text}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
            {[me, opp].map((m) => (
              <div
                key={m}
                className={clsx(
                  'rounded-2xl px-3 py-2',
                  m === 'X' ? 'bg-xmark-light/60' : 'bg-omark-light/60',
                )}
              >
                <p className="text-[11px] font-bold uppercase text-ink-muted">
                  {m === me ? 'You' : names[m]}
                  {last.subject && (last.subject === m ? ' · answer' : ' · guess')}
                </p>
                <p className="font-bold">{lastQuestion.options[last[m]]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {game.status === 'IN_PROGRESS' && question && (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-5 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-200">{prompt}</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{question.text}</h3>
          </div>
          <div className="p-4">
            {locked ? (
              <LockedIn name={names[opp]} />
            ) : (
              <>
                <div
                  className={clsx(
                    'grid gap-2.5',
                    question.options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2',
                  )}
                >
                  {question.options.map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      data-option={i}
                      disabled={!interactive}
                      onClick={() => onMove(i)}
                      className="rounded-2xl border border-line bg-white px-4 py-4 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-card active:scale-[0.98] disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <PartnerStatus locked={ext.answers[opp] !== null} name={names[opp]} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- memory match ---------------------------------- */

export function MemoryBoard({ game, interactive, onMove }: BoardProps) {
  const ext = game.ext as MemoryExt;
  const miss = new Set(ext.lastMiss);

  return (
    <div
      role="grid"
      aria-label="Memory cards"
      className="mx-auto grid w-full max-w-[min(94vw,520px)] select-none gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}
    >
      {ext.cards.map((face, i) => {
        const owner = ext.matched[i];
        const up = face !== '';
        const canPlay = interactive && !up;
        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            data-card={i}
            aria-label={`Card ${i + 1}: ${up ? face : 'face down'}${owner ? `, matched by ${owner}` : ''}`}
            aria-disabled={!canPlay}
            onClick={() => canPlay && onMove(i)}
            className={clsx(
              'relative flex aspect-[3/4] items-center justify-center rounded-2xl text-3xl shadow-sm transition duration-300 sm:text-4xl',
              !up && 'bg-gradient-to-br from-brand-400 to-brand-700',
              !up && canPlay && 'cursor-pointer hover:-translate-y-1 hover:shadow-card',
              up && !owner && 'animate-pop border-2 border-brand-300 bg-white',
              owner === 'X' && 'bg-xmark-light',
              owner === 'O' && 'bg-omark-light',
              miss.has(i) && 'animate-shake',
              !canPlay && 'cursor-default',
            )}
          >
            {up ? (
              <span aria-hidden="true">{face}</span>
            ) : (
              <span className="text-lg font-black text-white/40" aria-hidden="true">
                ?
              </span>
            )}
            {owner && (
              <Mark mark={owner} className="absolute right-1.5 top-1.5 h-4 w-4" strokeWidth={18} />
            )}
          </button>
        );
      })}
    </div>
  );
}
