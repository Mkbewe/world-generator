/**
 * Shared chamfer distance transform for region owner rasters. The generator
 * measures physical metres for the border water band; the preview measures
 * raster cells for screen gutters. Both use the same algorithm and the same
 * neighbour rules, with their own step costs and initial border value.
 */
export interface GridDistanceOptions {
  /** Distance written on a cell that touches another region, in caller units. */
  readonly borderDistance: number;
  /** Distance written on a region cell without a border, in caller units. */
  readonly farDistance: number;
  /** Cost of one orthogonal step along the x axis. */
  readonly stepX: number;
  /** Cost of one orthogonal step along the y axis. */
  readonly stepY: number;
  /** Cost of one diagonal step. */
  readonly diagonal: number;
}

/**
 * Distance from each region cell to the nearest cell of another region. Cells
 * outside every region stay zero; distances never propagate across a region
 * border, so each region measures its own border.
 */
export function gridDistanceTransform(
  owner: Int16Array,
  width: number,
  height: number,
  options: GridDistanceOptions
): Float32Array {
  const distances = new Float32Array(owner.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (owner[index] < 0) {
        continue;
      }
      distances[index] = touchesForeignRegion(owner, width, height, x, y)
        ? options.borderDistance
        : options.farDistance;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      relax(distances, owner, width, height, x, y, x - 1, y, options.stepX);
      relax(distances, owner, width, height, x, y, x, y - 1, options.stepY);
      relax(distances, owner, width, height, x, y, x - 1, y - 1, options.diagonal);
      relax(distances, owner, width, height, x, y, x + 1, y - 1, options.diagonal);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      relax(distances, owner, width, height, x, y, x + 1, y, options.stepX);
      relax(distances, owner, width, height, x, y, x, y + 1, options.stepY);
      relax(distances, owner, width, height, x, y, x + 1, y + 1, options.diagonal);
      relax(distances, owner, width, height, x, y, x - 1, y + 1, options.diagonal);
    }
  }
  return distances;
}

/** Whether a cell has a 4-neighbour owned by a different region. */
function touchesForeignRegion(
  owner: Int16Array,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  const index = y * width + x;
  const own = owner[index];
  if (x > 0 && isForeign(owner[index - 1], own)) {
    return true;
  }
  if (x + 1 < width && isForeign(owner[index + 1], own)) {
    return true;
  }
  if (y > 0 && isForeign(owner[index - width], own)) {
    return true;
  }
  return y + 1 < height && isForeign(owner[index + width], own);
}

function isForeign(neighbour: number, own: number): boolean {
  return neighbour >= 0 && neighbour !== own;
}

/** Propagates the border distance from one cell to a same-region neighbour. */
function relax(
  distances: Float32Array,
  owner: Int16Array,
  width: number,
  height: number,
  x: number,
  y: number,
  otherX: number,
  otherY: number,
  step: number
): void {
  if (otherX < 0 || otherY < 0 || otherX >= width || otherY >= height) {
    return;
  }
  const index = y * width + x;
  const other = otherY * width + otherX;
  if (owner[index] < 0 || owner[index] !== owner[other]) {
    return;
  }
  const candidate = distances[other] + step;
  if (candidate < distances[index]) {
    distances[index] = candidate;
  }
}
