import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants';

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function isValidRoomCode(code: string): boolean {
  return CODE_RE.test(code);
}

/**
 * Accepts a raw room code ("abc-234", " ABC234 ") or an invite URL
 * ("https://host/room/ABC234", "https://host/join?code=ABC234") and returns
 * the canonical upper-case code, or null if nothing valid was found.
 */
export function extractRoomCode(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromPath = raw.match(/\/room\/([A-Za-z0-9-]+)/);
  const fromQuery = raw.match(/[?&]code=([A-Za-z0-9-]+)/);
  const candidate = (fromPath?.[1] ?? fromQuery?.[1] ?? raw).replace(/[\s-]/g, '').toUpperCase();
  return isValidRoomCode(candidate) ? candidate : null;
}

export function formatRoomCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}
