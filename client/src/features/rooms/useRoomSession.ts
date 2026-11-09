import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GAME_CATALOG,
  type ChatMessage,
  type GameType,
  type MoveRejectedPayload,
  type PlayerEventPayload,
  type PlayerStatusPayload,
  type ReactionEmoji,
  type ReactionEvent,
  type RematchStatusPayload,
  type RoomPreview,
  type RoomSnapshot,
} from '@arena/shared';
import { ApiError, toApiError } from '../../lib/errors';
import { newMoveId } from '../../lib/ids';
import { socketManager } from '../../lib/socket';
import { playSound } from '../../lib/sound';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { toast } from '../../store/toastStore';
import { deriveRoomView } from './roomModel';

export type RoomPhase =
  | { kind: 'loading' }
  | { kind: 'preview'; preview: RoomPreview }
  | { kind: 'error'; error: ApiError }
  | { kind: 'ready' };

type SnapshotAck = { snapshot: RoomSnapshot };

/**
 * Owns the lifecycle of one room page: restores membership (also after every
 * socket reconnect), subscribes to server events, and exposes guarded actions.
 */
export function useRoomSession(roomCode: string, options: { autoJoin?: boolean } = {}) {
  const navigate = useNavigate();
  const playerId = useAuthStore((s) => s.profile?.playerId ?? null);
  const snapshot = useRoomStore((s) => (s.snapshot?.roomCode === roomCode ? s.snapshot : null));
  const [phase, setPhase] = useState<RoomPhase>({ kind: 'loading' });
  const [pendingMove, setPendingMove] = useState(false);
  const [busy, setBusy] = useState({ rematch: false, leave: false, create: false, join: false });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pendingRef = useRef(false);
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;
  const autoJoinRef = useRef(options.autoJoin ?? false);

  const apply = useCallback(
    (s: RoomSnapshot) => {
      if (s.roomCode === roomCode) useRoomStore.getState().applySnapshot(s);
    },
    [roomCode],
  );

  const join = useCallback(async () => {
    setBusy((b) => ({ ...b, join: true }));
    try {
      const { snapshot: s } = await socketManager.request<SnapshotAck>('room:join', { roomCode });
      apply(s);
      setPhase({ kind: 'ready' });
    } catch (err) {
      setPhase({ kind: 'error', error: toApiError(err) });
    } finally {
      setBusy((b) => ({ ...b, join: false }));
    }
  }, [apply, roomCode]);

  const restore = useCallback(async () => {
    try {
      const res = await socketManager.request<SnapshotAck & { chat: ChatMessage[] }>(
        'session:reconnect',
        { roomCode },
      );
      apply(res.snapshot);
      useRoomStore.getState().setChat(Array.isArray(res.chat) ? res.chat : []);
      setPhase({ kind: 'ready' });
    } catch (err) {
      const error = toApiError(err);
      if (error.code === 'NOT_A_MEMBER') {
        try {
          const preview = await socketManager.request<RoomPreview>('room:preview', { roomCode });
          if (!preview.joinable) {
            setPhase({ kind: 'error', error: new ApiError('ROOM_FULL') });
          } else if (autoJoinRef.current) {
            autoJoinRef.current = false;
            await join();
          } else {
            setPhase({ kind: 'preview', preview });
          }
        } catch (previewErr) {
          setPhase({ kind: 'error', error: toApiError(previewErr) });
        }
      } else if (phaseRef.current.kind === 'ready' && error.code === 'TIMEOUT') {
        // Keep the last known state on screen; the next reconnect retries.
      } else {
        setPhase({ kind: 'error', error });
      }
    }
  }, [apply, join, roomCode]);

  // Subscriptions: (re)bound per room and identity, always cleaned up on unmount.
  useEffect(() => {
    if (!playerId) return;
    useRoomStore.getState().reset();
    setPhase({ kind: 'loading' });
    const socket = socketManager.ensure();
    const isMe = (id: string) => id === playerIdRef.current;

    const onConnect = () => {
      if (phaseRef.current.kind === 'ready') void restore();
    };
    const onSnapshot = (s: RoomSnapshot) => apply(s);
    const onJoined = (p: PlayerEventPayload) => {
      if (p.roomCode === roomCode && !isMe(p.playerId))
        toast.success(`${p.displayName} joined. Let's play!`);
    };
    const onStatus = (p: PlayerStatusPayload) => {
      if (p.roomCode !== roomCode || isMe(p.playerId)) return;
      const grace = useRoomStore.getState().snapshot?.reconnectGraceSeconds ?? 90;
      if (p.connected) toast.success(`${p.displayName} is back online.`);
      else toast.warning(`${p.displayName} disconnected. Holding their seat for ${grace}s.`);
    };
    const onLeft = (p: PlayerEventPayload) => {
      if (p.roomCode === roomCode && !isMe(p.playerId))
        toast.info(`${p.displayName} left the room.`);
    };
    const onRematch = (p: RematchStatusPayload) => {
      if (p.roomCode !== roomCode) return;
      if (p.declinedBy && !isMe(p.declinedBy)) toast.info('Your partner said “not now”.');
      const proposer = p.votes.find((v) => !isMe(v));
      if (proposer && p.votes.length === 1) {
        playSound('turn');
        toast.info(
          `New suggestion: ${GAME_CATALOG[p.nextGameType].emoji} ${GAME_CATALOG[p.nextGameType].name}`,
        );
      }
    };
    const onRejected = (p: MoveRejectedPayload) => {
      if (p.snapshot) apply(p.snapshot);
    };
    const onChat = (m: ChatMessage) => useRoomStore.getState().addChat(m);
    const onReaction = (r: ReactionEvent) => useRoomStore.getState().addReaction(r);
    const onSessionError = (e: { message: string }) => toast.error(e.message);

    socket.on('connect', onConnect);
    socket.on('room:state', onSnapshot);
    socket.on('game:state', onSnapshot);
    socket.on('room:player-joined', onJoined);
    socket.on('room:player-status', onStatus);
    socket.on('room:player-left', onLeft);
    socket.on('game:rematch-status', onRematch);
    socket.on('game:move-rejected', onRejected);
    socket.on('chat:message', onChat);
    socket.on('room:reaction', onReaction);
    socket.on('session:error', onSessionError);
    void restore();

    return () => {
      socket.off('connect', onConnect);
      socket.off('room:state', onSnapshot);
      socket.off('game:state', onSnapshot);
      socket.off('room:player-joined', onJoined);
      socket.off('room:player-status', onStatus);
      socket.off('room:player-left', onLeft);
      socket.off('game:rematch-status', onRematch);
      socket.off('game:move-rejected', onRejected);
      socket.off('chat:message', onChat);
      socket.off('room:reaction', onReaction);
      socket.off('session:error', onSessionError);
    };
  }, [roomCode, playerId, apply, restore]);

  // Sound + feedback derived from authoritative state transitions.
  const prevRef = useRef<RoomSnapshot | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = snapshot;
    if (!prev || !snapshot || prev.roomCode !== snapshot.roomCode) return;
    if (snapshot.roundVersion > prev.roundVersion) {
      const g = GAME_CATALOG[snapshot.gameType];
      toast.success(`Round ${snapshot.roundNumber}: ${g.emoji} ${g.name}! Marks swapped.`);
      return;
    }
    if (snapshot.gameType !== prev.gameType) return; // host changed game while waiting
    if (snapshot.game.moveCount > prev.game.moveCount && snapshot.game.lastMove) {
      playSound(snapshot.game.lastMove.mark === 'X' ? 'placeX' : 'placeO');
    }
    if (prev.players.length < 2 && snapshot.players.length === 2) playSound('join');
    if (prev.game.status !== 'COMPLETED' && snapshot.game.status === 'COMPLETED') {
      const { result } = deriveRoomView(snapshot, playerIdRef.current);
      setTimeout(
        () =>
          playSound(
            result === 'win' || result === 'coop' ? 'win' : result === 'loss' ? 'lose' : 'draw',
          ),
        250,
      );
    }
  }, [snapshot]);

  /* -------------------------------- actions -------------------------------- */

  const makeMove = useCallback(
    async (index: number) => {
      const current = useRoomStore.getState().snapshot;
      if (!current || pendingRef.current) return; // prevent double submissions
      pendingRef.current = true;
      setPendingMove(true);
      try {
        const { snapshot: s } = await socketManager.request<SnapshotAck>('game:make-move', {
          roomCode,
          roundVersion: current.roundVersion,
          expectedStep: current.game.step,
          moveId: newMoveId(),
          index,
        });
        apply(s);
      } catch (err) {
        const error = toApiError(err);
        playSound('error');
        if (error.code === 'STALE_STATE' || error.code === 'STALE_ROUND') toast.info(error.message);
        else toast.error(error.message);
      } finally {
        pendingRef.current = false;
        setPendingMove(false);
      }
    },
    [apply, roomCode],
  );

  const vote = useCallback(
    async (
      event: 'game:rematch-request' | 'game:rematch-response',
      extra: Record<string, unknown>,
    ) => {
      const current = useRoomStore.getState().snapshot;
      if (!current) return;
      setBusy((b) => ({ ...b, rematch: true }));
      try {
        const { snapshot: s } = await socketManager.request<SnapshotAck>(event, {
          roomCode,
          roundVersion: current.roundVersion,
          ...extra,
        });
        apply(s);
      } catch (err) {
        toast.error(toApiError(err).message);
      } finally {
        setBusy((b) => ({ ...b, rematch: false }));
      }
    },
    [apply, roomCode],
  );

  const leave = useCallback(async () => {
    setBusy((b) => ({ ...b, leave: true }));
    try {
      await socketManager.request('room:leave', { roomCode });
      useRoomStore.getState().reset();
      toast.info('You left the room.');
      navigate('/');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy((b) => ({ ...b, leave: false }));
    }
  }, [navigate, roomCode]);

  const newRoom = useCallback(
    async (gameType: GameType) => {
      setBusy((b) => ({ ...b, create: true }));
      try {
        const { snapshot: s } = await socketManager.request<SnapshotAck>('room:create', {
          gameType,
        });
        useRoomStore.getState().reset();
        navigate(`/room/${s.roomCode}`);
      } catch (err) {
        toast.error(toApiError(err).message);
      } finally {
        setBusy((b) => ({ ...b, create: false }));
      }
    },
    [navigate],
  );

  const sendChat = useCallback(
    async (text: string) => {
      try {
        await socketManager.request('chat:send', { roomCode, text });
        return true;
      } catch (err) {
        toast.error(toApiError(err).message);
        return false;
      }
    },
    [roomCode],
  );

  const react = useCallback(
    (emoji: ReactionEmoji) => {
      socketManager
        .request('room:reaction', { roomCode, emoji })
        .catch((err) => toast.error(toApiError(err).message));
    },
    [roomCode],
  );

  return {
    phase,
    snapshot,
    playerId,
    pendingMove,
    busy,
    retry: restore,
    actions: {
      join,
      makeMove,
      propose: (gameType?: GameType) => vote('game:rematch-request', gameType ? { gameType } : {}),
      respond: (accept: boolean) => vote('game:rematch-response', { accept }),
      leave,
      newRoom,
      sendChat,
      react,
    },
  };
}
