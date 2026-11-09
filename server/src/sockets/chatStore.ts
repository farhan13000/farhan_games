import type { ChatMessage } from '@arena/shared';

const MAX_MESSAGES_PER_ROOM = 50;

/**
 * Ephemeral in-room chat history (not persisted by design: chat is optional,
 * privacy-friendly, and irrelevant to game integrity).
 */
export class ChatStore {
  private readonly rooms = new Map<string, ChatMessage[]>();

  add(roomCode: string, message: ChatMessage): void {
    const list = this.rooms.get(roomCode) ?? [];
    list.push(message);
    if (list.length > MAX_MESSAGES_PER_ROOM) list.splice(0, list.length - MAX_MESSAGES_PER_ROOM);
    this.rooms.set(roomCode, list);
  }

  history(roomCode: string): ChatMessage[] {
    return [...(this.rooms.get(roomCode) ?? [])];
  }

  clear(roomCode: string): void {
    this.rooms.delete(roomCode);
  }
}
