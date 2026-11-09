import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Roving tabindex for a rows x cols grid of buttons: one tab stop, arrow keys move
 * focus, Home/End jump within the row. Enter/Space activate the focused button natively.
 */
export function useRovingFocus(rows: number, cols: number, initial = 0) {
  const [active, setActive] = useState(initial);
  const refs = useRef<Array<HTMLElement | null>>([]);

  const focus = useCallback((index: number) => {
    setActive(index);
    refs.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent, index: number) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      let next: number | null = null;
      if (e.key === 'ArrowRight') next = r * cols + Math.min(cols - 1, c + 1);
      else if (e.key === 'ArrowLeft') next = r * cols + Math.max(0, c - 1);
      else if (e.key === 'ArrowDown') next = Math.min(rows - 1, r + 1) * cols + c;
      else if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * cols + c;
      else if (e.key === 'Home') next = r * cols;
      else if (e.key === 'End') next = r * cols + cols - 1;
      if (next !== null) {
        e.preventDefault();
        focus(next);
      }
    },
    [cols, rows, focus],
  );

  const itemProps = (index: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[index] = el;
    },
    tabIndex: index === active ? 0 : -1,
    onFocus: () => setActive(index),
    onKeyDown: (e: KeyboardEvent) => onKeyDown(e, index),
  });

  return { active, itemProps };
}
