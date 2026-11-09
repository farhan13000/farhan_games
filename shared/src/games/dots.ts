/**
 * Dots & Boxes geometry for a board of `rows` x `cols` boxes.
 * Lines are indexed with all horizontal lines first, then all vertical lines.
 */
export function horizontalLineCount(rows: number, cols: number): number {
  return (rows + 1) * cols;
}

export function lineCount(rows: number, cols: number): number {
  return horizontalLineCount(rows, cols) + rows * (cols + 1);
}

export function hLine(r: number, c: number, cols: number): number {
  return r * cols + c;
}

export function vLine(r: number, c: number, rows: number, cols: number): number {
  return horizontalLineCount(rows, cols) + r * (cols + 1) + c;
}

/** The four line indices surrounding box (r, c): top, bottom, left, right. */
export function boxEdges(
  r: number,
  c: number,
  rows: number,
  cols: number,
): [number, number, number, number] {
  return [
    hLine(r, c, cols),
    hLine(r + 1, c, cols),
    vLine(r, c, rows, cols),
    vLine(r, c + 1, rows, cols),
  ];
}

/** Box indices (row-major) adjacent to a given line. */
export function boxesForLine(line: number, rows: number, cols: number): number[] {
  const hCount = horizontalLineCount(rows, cols);
  const boxes: number[] = [];
  if (line < hCount) {
    const r = Math.floor(line / cols);
    const c = line % cols;
    if (r > 0) boxes.push((r - 1) * cols + c);
    if (r < rows) boxes.push(r * cols + c);
  } else {
    const v = line - hCount;
    const r = Math.floor(v / (cols + 1));
    const c = v % (cols + 1);
    if (c > 0) boxes.push(r * cols + (c - 1));
    if (c < cols) boxes.push(r * cols + c);
  }
  return boxes;
}

export interface LineGeometry {
  orientation: 'h' | 'v';
  r: number;
  c: number;
}

export function describeLine(line: number, rows: number, cols: number): LineGeometry {
  const hCount = horizontalLineCount(rows, cols);
  if (line < hCount) return { orientation: 'h', r: Math.floor(line / cols), c: line % cols };
  const v = line - hCount;
  return { orientation: 'v', r: Math.floor(v / (cols + 1)), c: v % (cols + 1) };
}
