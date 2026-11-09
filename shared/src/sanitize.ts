// Control characters, zero-width characters and bidi overrides.
const CONTROL_PATTERN =
  '[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u2028-\\u202E\\u2060-\\u206F\\uFEFF]';
const CONTROL_CHARS = new RegExp(CONTROL_PATTERN, 'g');

/** Normalizes unicode, strips control/invisible characters and collapses whitespace. */
export function sanitizeText(input: string): string {
  return input.normalize('NFKC').replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
}

/** Letters (any language), digits, spaces and a few punctuation marks. */
export const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _.'-]+$/u;
