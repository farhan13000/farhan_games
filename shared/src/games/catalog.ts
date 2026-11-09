import type { GameCategory, GameInfo, GameType } from './types';

type Info = Omit<GameInfo, 'id'>;

const info = (i: Info) => i;

export const GAME_CATALOG: Record<GameType, GameInfo> = {
  /* -------------------------------- classics -------------------------------- */
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    ...info({
      name: 'Tic-Tac-Toe',
      emoji: '❌',
      category: 'classic',
      tagline: 'The timeless 3×3 duel',
      description: 'Quick, sharp and endlessly replayable. Line up three marks to win.',
      kind: 'grid',
      rows: 3,
      cols: 3,
      winLength: 3,
      duration: '~1 min',
      coop: false,
      rules: [
        'X always moves first; players swap marks every round.',
        'Get three in a row horizontally, vertically or diagonally.',
        'A full board with no line is a draw.',
      ],
    }),
  },
  'four-in-a-row': {
    id: 'four-in-a-row',
    ...info({
      name: 'Four in a Row',
      emoji: '🔴',
      category: 'classic',
      tagline: 'Drop, stack, connect',
      description: 'Discs fall to the lowest open slot. Connect four before your partner does.',
      kind: 'drop',
      rows: 6,
      cols: 7,
      winLength: 4,
      duration: '~5 min',
      coop: false,
      rules: [
        'Pick a column and your disc drops to the lowest empty slot.',
        'Connect four horizontally, vertically or diagonally to win.',
        'If all 42 slots fill up without a line, the round is a draw.',
      ],
    }),
  },
  'dots-and-boxes': {
    id: 'dots-and-boxes',
    ...info({
      name: 'Dots & Boxes',
      emoji: '🔲',
      category: 'classic',
      tagline: 'Close a box, go again',
      description: 'Draw lines between dots. Complete a box to claim it and take another turn.',
      kind: 'dots',
      rows: 4,
      cols: 4,
      winLength: 0,
      duration: '~6 min',
      coop: false,
      rules: [
        'On your turn, draw one line between two neighbouring dots.',
        'Close the fourth side of a box to claim it and move again.',
        'When every line is drawn, the player with the most boxes wins.',
      ],
    }),
  },
  'memory-match': {
    id: 'memory-match',
    ...info({
      name: 'Memory Match',
      emoji: '🃏',
      category: 'social',
      tagline: 'Flip, remember, match',
      description: 'Take turns flipping two cards. Find a pair to keep them and go again.',
      kind: 'memory',
      rows: 4,
      cols: 5,
      winLength: 0,
      duration: '~5 min',
      coop: false,
      rules: [
        'Flip two cards per turn. Both players see every flip.',
        'A matching pair is yours, and you flip again.',
        'Most pairs when the board is cleared wins.',
      ],
    }),
  },

  /* ------------------------------ besties & couples ------------------------------ */
  'know-me': {
    id: 'know-me',
    ...info({
      name: 'How Well Do You Know Me?',
      emoji: '💞',
      category: 'social',
      tagline: 'Guess your partner’s answers',
      description:
        'Take turns answering questions about yourself while your partner guesses. Who knows who better?',
      kind: 'quiz',
      rows: 0,
      cols: 0,
      winLength: 0,
      duration: '~5 min',
      coop: false,
      rules: [
        '10 questions. You take turns being the one in the spotlight.',
        'The spotlight player answers honestly; the other secretly guesses.',
        'Each correct guess scores a point for the guesser.',
      ],
    }),
  },
  'in-sync': {
    id: 'in-sync',
    ...info({
      name: 'In Sync',
      emoji: '🔮',
      category: 'social',
      tagline: 'Are you on the same wavelength?',
      description:
        'Both secretly pick “this or that”. Match picks to raise your shared sync score.',
      kind: 'quiz',
      rows: 0,
      cols: 0,
      winLength: 0,
      duration: '~4 min',
      coop: true,
      rules: [
        'You play together, not against each other.',
        'Each of you secretly picks one option, then both picks are revealed.',
        'Every match adds to your shared score out of 10.',
      ],
    }),
  },
  'rock-paper-scissors': {
    id: 'rock-paper-scissors',
    ...info({
      name: 'Rock Paper Scissors',
      emoji: '✊',
      category: 'social',
      tagline: 'Settle it. Best of five.',
      description: 'Lock in your throw secretly. Reveal together. First to three wins takes it.',
      kind: 'rps',
      rows: 0,
      cols: 0,
      winLength: 0,
      duration: '~1 min',
      coop: false,
      rules: [
        'Rock beats scissors, scissors beat paper, paper beats rock.',
        'Picks stay hidden until both of you have locked in.',
        'Ties replay. First to 3 wins the match.',
      ],
    }),
  },

  /* ------------------------------ brainy / strategy ------------------------------ */
  reversi: {
    id: 'reversi',
    ...info({
      name: 'Reversi',
      emoji: '⚫',
      category: 'strategy',
      tagline: 'Outflank and flip',
      description:
        'Trap your partner’s discs between yours to flip them. Own the board at the end.',
      kind: 'reversi',
      rows: 8,
      cols: 8,
      winLength: 0,
      duration: '~10 min',
      coop: false,
      rules: [
        'Place a disc so it sandwiches a line of opponent discs, then flip them.',
        'Every move must flip at least one disc. If you cannot move, you pass.',
        'When nobody can move, the player with more discs wins.',
      ],
    }),
  },
  'ultimate-tic-tac-toe': {
    id: 'ultimate-tic-tac-toe',
    ...info({
      name: 'Ultimate Tic-Tac-Toe',
      emoji: '🧠',
      category: 'strategy',
      tagline: 'Nine boards, one big brain',
      description:
        'Each move decides where your partner must play next. Win small boards to win the big one.',
      kind: 'uttt',
      rows: 9,
      cols: 9,
      winLength: 3,
      duration: '~8 min',
      coop: false,
      rules: [
        'Win a small board with three in a row to claim it.',
        'The cell you pick sends your partner to that small board next.',
        'If that board is decided, they may play anywhere. Claim three boards in a row to win.',
      ],
    }),
  },
  mancala: {
    id: 'mancala',
    ...info({
      name: 'Mancala',
      emoji: '🪨',
      category: 'strategy',
      tagline: 'Sow seeds, plan ahead',
      description: 'An ancient counting game. Sow seeds around the board and fill your store.',
      kind: 'mancala',
      rows: 2,
      cols: 6,
      winLength: 0,
      duration: '~7 min',
      coop: false,
      rules: [
        'Pick one of your pits and sow its seeds one by one counter-clockwise.',
        'Land your last seed in your store to go again.',
        'Land in an empty pit on your side to capture the seeds opposite. Most seeds wins.',
      ],
    }),
  },
  hex: {
    id: 'hex',
    ...info({
      name: 'Hex',
      emoji: '⬡',
      category: 'strategy',
      tagline: 'Connect your sides',
      description:
        'Build an unbroken chain of hexagons between your two edges. Draws are impossible.',
      kind: 'hex',
      rows: 9,
      cols: 9,
      winLength: 0,
      duration: '~6 min',
      coop: false,
      rules: [
        'X connects top to bottom. O connects left to right.',
        'Take turns claiming any empty hexagon.',
        'The first unbroken chain between your edges wins.',
      ],
    }),
  },
  'five-in-a-row': {
    id: 'five-in-a-row',
    ...info({
      name: 'Five in a Row',
      emoji: '⭕',
      category: 'classic',
      tagline: 'Big board, deep strategy',
      description: 'A 13×13 battlefield where five consecutive marks claim victory.',
      kind: 'grid',
      rows: 13,
      cols: 13,
      winLength: 5,
      duration: '~8 min',
      coop: false,
      rules: [
        'Place one mark per turn anywhere on the 13×13 board.',
        'Five or more in an unbroken line wins.',
        'Block open threes early before they become unstoppable fours.',
      ],
    }),
  },
};

export const GAME_LIST: GameInfo[] = Object.values(GAME_CATALOG);

export const CATEGORY_INFO: Record<GameCategory, { title: string; blurb: string; emoji: string }> =
  {
    social: {
      title: 'Besties & Couples',
      blurb: 'Get to know each other, find your sync and settle friendly debates.',
      emoji: '💞',
    },
    strategy: {
      title: 'Brainy Battles',
      blurb: 'Deep strategy games that reward planning and patience.',
      emoji: '🧠',
    },
    classic: {
      title: 'Quick Classics',
      blurb: 'Familiar favourites for a fast game anytime.',
      emoji: '🎲',
    },
  };

export const CATEGORY_ORDER: GameCategory[] = ['social', 'strategy', 'classic'];

export function gamesInCategory(category: GameCategory): GameInfo[] {
  return GAME_LIST.filter((g) => g.category === category);
}
