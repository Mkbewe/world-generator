import { FrontierHeap } from './frontier-heap';

describe('FrontierHeap', () => {
  it('pops entries in score order', () => {
    const heap = new FrontierHeap();
    heap.push(3, 30, 1);
    heap.push(1, 10, 0);
    heap.push(2, 20, 2);
    const entry = { score: 0, cell: 0, region: 0 };
    const popped: number[] = [];

    while (heap.popInto(entry)) {
      popped.push(entry.score);
    }

    expect(popped).toEqual([1, 2, 3]);
  });

  it('breaks score ties by region, then cell', () => {
    const heap = new FrontierHeap();
    heap.push(1, 5, 2);
    heap.push(1, 4, 1);
    heap.push(1, 3, 1);
    const entry = { score: 0, cell: 0, region: 0 };
    const popped: Array<readonly [number, number]> = [];

    while (heap.popInto(entry)) {
      popped.push([entry.region, entry.cell]);
    }

    expect(popped).toEqual([
      [1, 3],
      [1, 4],
      [2, 5],
    ]);
  });

  it('reports an empty heap', () => {
    const heap = new FrontierHeap();
    const entry = { score: 0, cell: 0, region: 0 };

    expect(heap.popInto(entry)).toBe(false);
    heap.push(1, 1, 0);
    expect(heap.popInto(entry)).toBe(true);
    expect(heap.popInto(entry)).toBe(false);
  });
});
