/** Binary min-heap over the region frontier; ties resolve by region, then cell. */
export class FrontierHeap {
  private readonly scores: number[] = [];
  private readonly cells: number[] = [];
  private readonly regions: number[] = [];

  push(score: number, cell: number, region: number): void {
    let index = this.scores.length;
    this.scores.push(score);
    this.cells.push(cell);
    this.regions.push(region);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!this.less(index, parent)) {
        break;
      }
      this.swap(index, parent);
      index = parent;
    }
  }

  popInto(entry: { score: number; cell: number; region: number }): boolean {
    const size = this.scores.length;
    if (size === 0) {
      return false;
    }
    entry.score = this.scores[0] ?? 0;
    entry.cell = this.cells[0] ?? 0;
    entry.region = this.regions[0] ?? 0;
    const last = size - 1;
    this.scores[0] = this.scores[last] ?? 0;
    this.cells[0] = this.cells[last] ?? 0;
    this.regions[0] = this.regions[last] ?? 0;
    this.scores.pop();
    this.cells.pop();
    this.regions.pop();
    let index = 0;
    const length = this.scores.length;
    while (true) {
      const left = index * 2 + 1;
      if (left >= length) {
        break;
      }
      const right = left + 1;
      const child = right < length && this.less(right, left) ? right : left;
      if (!this.less(child, index)) {
        break;
      }
      this.swap(index, child);
      index = child;
    }
    return true;
  }

  private less(left: number, right: number): boolean {
    const leftScore = this.scores[left] ?? 0;
    const rightScore = this.scores[right] ?? 0;
    if (leftScore !== rightScore) {
      return leftScore < rightScore;
    }
    const leftRegion = this.regions[left] ?? 0;
    const rightRegion = this.regions[right] ?? 0;
    if (leftRegion !== rightRegion) {
      return leftRegion < rightRegion;
    }
    return (this.cells[left] ?? 0) < (this.cells[right] ?? 0);
  }

  private swap(left: number, right: number): void {
    const score = this.scores[left] ?? 0;
    this.scores[left] = this.scores[right] ?? 0;
    this.scores[right] = score;
    const cell = this.cells[left] ?? 0;
    this.cells[left] = this.cells[right] ?? 0;
    this.cells[right] = cell;
    const region = this.regions[left] ?? 0;
    this.regions[left] = this.regions[right] ?? 0;
    this.regions[right] = region;
  }
}
