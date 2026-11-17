/** Extend region ownership past the rasterized world edge before the smooth canvas clip. */
export function extendRegionOwners(owners: Int16Array, width: number, height: number): Int16Array {
  const extended = owners.slice();
  const queue = new Uint32Array(owners.length);
  let tail = 0;
  for (let index = 0; index < owners.length; index++) {
    if (owners[index] >= 0) {
      queue[tail++] = index;
    }
  }
  for (let head = 0; head < tail; head++) {
    const index = queue[head];
    const x = index % width;
    if (x > 0) {
      fill(index - 1, index);
    }
    if (x + 1 < width) {
      fill(index + 1, index);
    }
    if (index >= width) {
      fill(index - width, index);
    }
    if (index + width < width * height) {
      fill(index + width, index);
    }
  }
  return extended;

  function fill(index: number, source: number): void {
    if (extended[index] >= 0) {
      return;
    }
    extended[index] = extended[source];
    queue[tail++] = index;
  }
}
