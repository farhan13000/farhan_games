import type {
  Ack,
  ChatMessage,
  MoveRejectedPayload,
  MoveResult,
  PlayerEventPayload,
  PlayerStatusPayload,
  ReactionEvent,
  RematchStatusPayload,
  RoomClosedPayload,
  RoomPreview,
  RoomSnapshot,
  RoundCompletedPayload,
} from './types';
import type {
  ChatSendInput,
  CreateRoomInput,
  MakeMoveInput,
  ReactionInput,
  RematchRequestInput,
  RematchResponseInput,
  RoomRefInput,
} from './schemas';
import type { ApiErrorBody } from './types';

/** Client -> server events. Every event takes an acknowledgement callback. */
export const C2S = {
  ROOM_CREATE: 'room:create',
  ROOM_PREVIEW: 'room:preview',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  GAME_MAKE_MOVE: 'game:make-move',
  GAME_REMATCH_REQUEST: 'game:rematch-request',
  GAME_REMATCH_RESPONSE: 'game:rematch-response',
  SESSION_RECONNECT: 'session:reconnect',
  CHAT_SEND: 'chat:send',
  REACTION_SEND: 'room:reaction',
} as const;

/** Server -> client events. */
export const S2C = {
  ROOM_STATE: 'room:state',
  ROOM_PLAYER_JOINED: 'room:player-joined',
  ROOM_PLAYER_LEFT: 'room:player-left',
  ROOM_PLAYER_STATUS: 'room:player-status',
  ROOM_CLOSED: 'room:closed',
  ROOM_REACTION: 'room:reaction',
  GAME_STATE: 'game:state',
  GAME_MOVE_REJECTED: 'game:move-rejected',
  GAME_ROUND_COMPLETED: 'game:round-completed',
  GAME_REMATCH_STATUS: 'game:rematch-status',
  SESSION_ERROR: 'session:error',
  CHAT_MESSAGE: 'chat:message',
} as const;

type AckFn<T> = (response: Ack<T>) => void;

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomInput, ack: AckFn<{ snapshot: RoomSnapshot }>) => void;
  'room:preview': (payload: RoomRefInput, ack: AckFn<RoomPreview>) => void;
  'room:join': (payload: RoomRefInput, ack: AckFn<{ snapshot: RoomSnapshot }>) => void;
  'room:leave': (payload: RoomRefInput, ack: AckFn<{ left: true }>) => void;
  'game:make-move': (payload: MakeMoveInput, ack: AckFn<MoveResult>) => void;
  'game:rematch-request': (
    payload: RematchRequestInput,
    ack: AckFn<{ snapshot: RoomSnapshot }>,
  ) => void;
  'game:rematch-response': (
    payload: RematchResponseInput,
    ack: AckFn<{ snapshot: RoomSnapshot }>,
  ) => void;
  'session:reconnect': (
    payload: RoomRefInput,
    ack: AckFn<{ snapshot: RoomSnapshot; chat: ChatMessage[] }>,
  ) => void;
  'chat:send': (payload: ChatSendInput, ack: AckFn<{ message: ChatMessage }>) => void;
  'room:reaction': (payload: ReactionInput, ack: AckFn<{ sent: true }>) => void;
}

export interface ServerToClientEvents {
  'room:state': (snapshot: RoomSnapshot) => void;
  'room:player-joined': (payload: PlayerEventPayload) => void;
  'room:player-left': (payload: PlayerEventPayload) => void;
  'room:player-status': (payload: PlayerStatusPayload) => void;
  'room:closed': (payload: RoomClosedPayload) => void;
  'room:reaction': (payload: ReactionEvent) => void;
  'game:state': (snapshot: RoomSnapshot) => void;
  'game:move-rejected': (payload: MoveRejectedPayload) => void;
  'game:round-completed': (payload: RoundCompletedPayload) => void;
  'game:rematch-status': (payload: RematchStatusPayload) => void;
  'session:error': (payload: ApiErrorBody) => void;
  'chat:message': (message: ChatMessage) => void;
}
