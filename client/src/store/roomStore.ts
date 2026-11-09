import type { ChatMessage, ReactionEvent, RoomSnapshot } from '@arena/shared';
import { create } from 'zustand';

interface RoomState {
  /** Latest authoritative snapshot from the server. Never mutated locally. */
  snapshot: RoomSnapshot | null;
  chat: ChatMessage[];
  reactions: ReactionEvent[];
  applySnapshot: (snapshot: RoomSnapshot) => void;
  setChat: (messages: ChatMessage[]) => void;
  addChat: (message: ChatMessage) => void;
  addReaction: (reaction: ReactionEvent) => void;
  removeReaction: (id: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  snapshot: null,
  chat: [],
  reactions: [],
  applySnapshot: (incoming) =>
    set((state) => {
      const current = state.snapshot;
      // Ignore out-of-order deliveries of older versions of the same room.
      if (
        current &&
        current.roomCode === incoming.roomCode &&
        incoming.stateVersion < current.stateVersion
      ) {
        return state;
      }
      return { snapshot: incoming };
    }),
  setChat: (chat) => set({ chat }),
  addChat: (message) =>
    set((s) =>
      s.chat.some((m) => m.id === message.id) ? s : { chat: [...s.chat, message].slice(-50) },
    ),
  addReaction: (reaction) => set((s) => ({ reactions: [...s.reactions, reaction].slice(-12) })),
  removeReaction: (id) => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),
  reset: () => set({ snapshot: null, chat: [], reactions: [] }),
}));
