/**
 * In-memory map of which sockets represent which player in which room. A player
 * counts as connected while at least one of their sockets (tabs/devices) is in the room.
 */
export class PresenceTracker {
  private readonly rooms = new Map<string, Map<string, Set<string>>>();

  /** Returns true if this is the player's first socket in the room. */
  add(roomCode: string, playerId: string, socketId: string): boolean {
    let players = this.rooms.get(roomCode);
    if (!players) this.rooms.set(roomCode, (players = new Map()));
    let sockets = players.get(playerId);
    if (!sockets) players.set(playerId, (sockets = new Set()));
    const first = sockets.size === 0;
    sockets.add(socketId);
    return first;
  }

  /** Returns true if the player has no sockets left in the room. */
  remove(roomCode: string, playerId: string, socketId: string): boolean {
    const players = this.rooms.get(roomCode);
    const sockets = players?.get(playerId);
    if (!players || !sockets) return false;
    sockets.delete(socketId);
    if (sockets.size > 0) return false;
    players.delete(playerId);
    if (players.size === 0) this.rooms.delete(roomCode);
    return true;
  }

  socketsOf(roomCode: string, playerId: string): string[] {
    return [...(this.rooms.get(roomCode)?.get(playerId) ?? [])];
  }

  dropPlayer(roomCode: string, playerId: string): void {
    this.rooms.get(roomCode)?.delete(playerId);
  }
}
