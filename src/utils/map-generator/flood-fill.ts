export interface FloodFill4Options {
  readonly width: number;
  readonly height: number;
  readonly start: number;
  /** Returns true only after atomically marking an eligible cell as visited. */
  readonly tryVisit: (index: number) => boolean;
  readonly onVisit: (index: number, x: number, y: number) => void;
}

/** 4-neighbour flood-fill over a raster; keeps the logic in one place for connectivity checks. */
export function floodFill4(options: FloodFill4Options): void {
  const { width, height, start, tryVisit, onVisit } = options;
  if (!tryVisit(start)) {
    return;
  }
  const pending = [start];

  while (pending.length > 0) {
    const index = pending.pop();
    if (index === undefined) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    onVisit(index, x, y);

    if (x > 0) {
      visit(index - 1);
    }
    if (x + 1 < width) {
      visit(index + 1);
    }
    if (y > 0) {
      visit(index - width);
    }
    if (y + 1 < height) {
      visit(index + width);
    }
  }

  function visit(neighbour: number): void {
    if (tryVisit(neighbour)) {
      pending.push(neighbour);
    }
  }
}
