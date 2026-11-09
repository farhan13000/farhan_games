import clsx from 'clsx';
import type { GameType } from '@arena/shared';
import { Mark } from './Mark';

const dot = (mark: 'X' | 'O') => (mark === 'X' ? 'bg-xmark' : 'bg-omark');

/** Small decorative illustration of each game for cards and pickers. */
export function GamePreview({ gameType, className }: { gameType: GameType; className?: string }) {
  const Art = ART[gameType];
  return (
    <div className={clsx('flex items-center justify-center', className)} aria-hidden="true">
      <Art />
    </div>
  );
}

function TicTacToeArt() {
  const cells: Array<'X' | 'O' | null> = ['X', null, 'O', null, 'X', null, 'O', null, 'X'];
  return (
    <div className="grid w-24 grid-cols-3 gap-1.5">
      {cells.map((c, i) => (
        <div
          key={i}
          className="flex aspect-square items-center justify-center rounded-lg bg-white shadow-sm"
        >
          {c && <Mark mark={c} className="h-[65%] w-[65%]" strokeWidth={16} />}
        </div>
      ))}
    </div>
  );
}

function FourArt() {
  const discs: Record<number, 'X' | 'O'> = {
    38: 'X',
    39: 'O',
    31: 'X',
    37: 'O',
    32: 'O',
    24: 'X',
    40: 'X',
    33: 'X',
    25: 'O',
  };
  return (
    <div className="grid w-28 grid-cols-7 gap-1 rounded-xl bg-brand-600 p-1.5">
      {Array.from({ length: 42 }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'aspect-square rounded-full',
            discs[i] ? dot(discs[i]) : 'bg-brand-900/40',
          )}
        />
      ))}
    </div>
  );
}

function FiveArt() {
  const stones: Record<number, 'X' | 'O'> = {
    20: 'X',
    30: 'X',
    40: 'X',
    50: 'X',
    31: 'O',
    41: 'O',
    22: 'O',
    49: 'O',
    39: 'O',
  };
  return (
    <div className="grid w-24 grid-cols-9 gap-[2px] rounded-lg bg-line p-[2px]">
      {Array.from({ length: 81 }, (_, i) => (
        <div key={i} className="flex aspect-square items-center justify-center bg-white">
          {stones[i] && <span className={clsx('h-[70%] w-[70%] rounded-full', dot(stones[i]))} />}
        </div>
      ))}
    </div>
  );
}

function DotsArt() {
  return (
    <svg viewBox="0 0 100 100" className="w-24">
      <rect x="14" y="14" width="34" height="34" rx="6" fill="#FFE4E8" />
      <path
        d="M31 24 L37 37 M37 24 L24 37"
        stroke="#F2456A"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M10 10 H50 V50 H10 Z"
        stroke="#F2456A"
        strokeWidth="5"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M50 10 H90 M50 50 V90 M10 90 H50"
        stroke="#1597E5"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {[10, 50, 90].flatMap((x) =>
        [10, 50, 90].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill="#14142B" />),
      )}
    </svg>
  );
}

function ReversiArt() {
  const discs: Record<number, 'X' | 'O'> = {
    14: 'O',
    15: 'X',
    20: 'X',
    21: 'X',
    22: 'O',
    9: 'X',
    27: 'O',
    16: 'X',
    28: 'X',
  };
  return (
    <div className="grid w-24 grid-cols-6 gap-[3px] rounded-xl bg-emerald-700 p-1.5">
      {Array.from({ length: 36 }, (_, i) => (
        <div
          key={i}
          className="flex aspect-square items-center justify-center rounded-[3px] bg-emerald-600"
        >
          {discs[i] && (
            <span className={clsx('h-[78%] w-[78%] rounded-full shadow-sm', dot(discs[i]))} />
          )}
        </div>
      ))}
    </div>
  );
}

function UtttArt() {
  const marks: Record<number, 'X' | 'O'> = {
    0: 'X',
    4: 'X',
    8: 'X',
    12: 'O',
    13: 'O',
    22: 'X',
    40: 'O',
    41: 'X',
    60: 'O',
    70: 'X',
    80: 'O',
  };
  return (
    <div className="grid w-24 grid-cols-3 gap-1">
      {Array.from({ length: 9 }, (_, b) => (
        <div
          key={b}
          className={clsx(
            'grid grid-cols-3 gap-px rounded-md p-0.5',
            b === 0 ? 'bg-xmark-light' : 'bg-white shadow-sm',
          )}
        >
          {Array.from({ length: 9 }, (_, c) => {
            const m = marks[b * 9 + c];
            return (
              <div
                key={c}
                className={clsx('aspect-square rounded-[1px]', m ? dot(m) : 'bg-canvas')}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MancalaArt() {
  const top = [4, 0, 6, 3, 5, 1];
  const bottom = [2, 5, 4, 0, 7, 3];
  const pit = (n: number, k: number) => (
    <div
      key={k}
      className="flex aspect-square items-center justify-center rounded-full bg-amber-900/25 text-[9px] font-bold text-amber-950"
    >
      {n}
    </div>
  );
  return (
    <div className="flex w-28 items-center gap-1 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-400 p-1.5">
      <div className="h-12 w-3.5 rounded-full bg-amber-900/25" />
      <div className="grid flex-1 grid-cols-6 gap-1">
        {top.map(pit)}
        {bottom.map((n, k) => pit(n, k + 6))}
      </div>
      <div className="h-12 w-3.5 rounded-full bg-amber-900/25" />
    </div>
  );
}

function HexArt() {
  const owner: Record<string, 'X' | 'O'> = {
    '0-1': 'X',
    '1-1': 'X',
    '2-0': 'X',
    '3-0': 'X',
    '1-2': 'O',
    '1-3': 'O',
    '2-2': 'O',
  };
  return (
    <svg viewBox="0 0 100 80" className="w-28">
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const cx = 18 + c * 17 + r * 8.5;
          const cy = 12 + r * 15;
          const pts = Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            return `${cx + 9 * Math.cos(a)},${cy + 9 * Math.sin(a)}`;
          }).join(' ');
          const o = owner[`${r}-${c}`];
          return (
            <polygon
              key={`${r}-${c}`}
              points={pts}
              fill={o === 'X' ? '#F2456A' : o === 'O' ? '#1597E5' : '#fff'}
              stroke="#E6E6F0"
              strokeWidth="1.5"
            />
          );
        }),
      )}
    </svg>
  );
}

function KnowMeArt() {
  return (
    <div className="relative h-24 w-28">
      <div className="absolute left-1 top-3 w-16 rotate-[-8deg] rounded-xl bg-white p-2 shadow-card">
        <div className="mb-1 h-1.5 w-10 rounded bg-ink/15" />
        <div className="h-3 rounded bg-xmark-light" />
        <div className="mt-1 h-3 rounded bg-canvas" />
      </div>
      <div className="absolute right-1 top-6 w-16 rotate-[7deg] rounded-xl bg-white p-2 shadow-card">
        <div className="mb-1 h-1.5 w-8 rounded bg-ink/15" />
        <div className="h-3 rounded bg-canvas" />
        <div className="mt-1 h-3 rounded bg-omark-light" />
      </div>
      <span className="absolute left-1/2 top-0 -translate-x-1/2 text-2xl">💞</span>
    </div>
  );
}

function InSyncArt() {
  return (
    <div className="relative flex h-20 w-28 items-center justify-center">
      <div className="absolute left-4 h-16 w-16 rounded-full bg-xmark/70 mix-blend-multiply" />
      <div className="absolute right-4 h-16 w-16 rounded-full bg-omark/70 mix-blend-multiply" />
      <span className="relative text-2xl">✨</span>
    </div>
  );
}

function RpsArt() {
  return (
    <div className="flex items-center gap-2 text-3xl">
      <span className="flex h-12 w-12 rotate-[-10deg] items-center justify-center rounded-2xl bg-xmark-light">
        ✊
      </span>
      <span className="text-sm font-black text-ink-muted">VS</span>
      <span className="flex h-12 w-12 rotate-[10deg] items-center justify-center rounded-2xl bg-omark-light">
        ✌️
      </span>
    </div>
  );
}

function MemoryArt() {
  const faces = ['', '🦊', '', '🦊', '🐼', '', '', ''];
  return (
    <div className="grid w-28 grid-cols-4 gap-1.5">
      {faces.map((f, i) => (
        <div
          key={i}
          className={clsx(
            'flex aspect-[3/4] items-center justify-center rounded-lg text-sm shadow-sm',
            f ? 'bg-white' : 'bg-gradient-to-br from-brand-400 to-brand-700',
          )}
        >
          {f}
        </div>
      ))}
    </div>
  );
}

const ART: Record<GameType, () => JSX.Element> = {
  'tic-tac-toe': TicTacToeArt,
  'four-in-a-row': FourArt,
  'five-in-a-row': FiveArt,
  'dots-and-boxes': DotsArt,
  reversi: ReversiArt,
  'ultimate-tic-tac-toe': UtttArt,
  mancala: MancalaArt,
  hex: HexArt,
  'know-me': KnowMeArt,
  'in-sync': InSyncArt,
  'rock-paper-scissors': RpsArt,
  'memory-match': MemoryArt,
};
