/** Central product configuration. The client may override the name via VITE_APP_NAME. */
export const APP_CONFIG = {
  name: 'TicTac Arena',
  tagline: 'Private rooms for two. 12 games. No sign-up, ever.',
} as const;

export const MARKS = ['X', 'O'] as const;
export type Mark = (typeof MARKS)[number];

export const ROOM_STATUSES = [
  'WAITING_FOR_PLAYER',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

/** Statuses in which a room is still "alive" (can be joined/reconnected/played). */
export const ACTIVE_ROOM_STATUSES: readonly RoomStatus[] = [
  'WAITING_FOR_PLAYER',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
];

export const END_REASONS = ['HOST_CLOSED', 'PLAYER_LEFT', 'PLAYER_TIMEOUT', 'EXPIRED'] as const;
export type EndReason = (typeof END_REASONS)[number];

export const DISPLAY_NAME_MAX_LENGTH = 20;
export const CHAT_MESSAGE_MAX_LENGTH = 200;

/** Readable room-code alphabet: no 0/O, 1/I/L ambiguity. 31 symbols ^ 6 ≈ 887M codes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export const REACTIONS = ['👏', '🔥', '😮', '😂', '🤝', '😎'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

/** Default acknowledgement timeout clients should use for socket requests. */
export const SOCKET_ACK_TIMEOUT_MS = 8000;
