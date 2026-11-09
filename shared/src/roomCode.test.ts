import { describe, expect, it } from 'vitest';
import { extractRoomCode, formatRoomCode, isValidRoomCode } from './roomCode';
import { displayNameSchema, roomCodeSchema } from './schemas';

describe('room codes', () => {
  it('validates the readable alphabet', () => {
    expect(isValidRoomCode('ABC234')).toBe(true);
    expect(isValidRoomCode('ABC10O')).toBe(false); // ambiguous chars excluded
    expect(isValidRoomCode('ABC23')).toBe(false);
  });

  it('extracts codes from raw input and invite URLs', () => {
    expect(extractRoomCode(' abc-234 ')).toBe('ABC234');
    expect(extractRoomCode('https://arena.example.com/room/XYZ789')).toBe('XYZ789');
    expect(extractRoomCode('http://localhost:5173/join?code=hjk456')).toBe('HJK456');
    expect(extractRoomCode('not a code')).toBeNull();
    expect(extractRoomCode('')).toBeNull();
  });

  it('formats codes for display', () => {
    expect(formatRoomCode('ABC234')).toBe('ABC-234');
  });

  it('normalizes codes in the schema', () => {
    expect(roomCodeSchema.parse('abc-234')).toBe('ABC234');
    expect(roomCodeSchema.safeParse('000000').success).toBe(false);
  });
});

describe('displayNameSchema', () => {
  it('trims, collapses whitespace and strips control characters', () => {
    expect(displayNameSchema.parse('  Ada \u0000  Lovelace ')).toBe('Ada Lovelace');
  });
  it('rejects markup and overly long names', () => {
    expect(displayNameSchema.safeParse('<script>').success).toBe(false);
    expect(displayNameSchema.safeParse('a'.repeat(21)).success).toBe(false);
    expect(displayNameSchema.safeParse('A').success).toBe(false);
  });
  it('accepts international names', () => {
    expect(displayNameSchema.parse('Zoë Ñúñez')).toBe('Zoë Ñúñez');
  });
});
