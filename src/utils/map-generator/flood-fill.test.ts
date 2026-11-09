import { floodFill4 } from './flood-fill';

describe('floodFill4', () => {
  it('visits only the connected cells and marks each before visiting it', () => {
    const inside = new Uint8Array([1, 1, 0, 1, 1, 0]);
    const visited = new Uint8Array(inside.length);
    const visits: number[] = [];

    floodFill4({
      width: 3,
      height: 2,
      start: 0,
      tryVisit: index => {
        if (inside[index] !== 1 || visited[index] === 1) {
          return false;
        }
        visited[index] = 1;
        return true;
      },
      onVisit: index => {
        expect(visited[index]).toBe(1);
        visits.push(index);
      },
    });

    expect(visits).toEqual([0, 3, 4, 1]);
  });

  it('does not carry visited state between calls', () => {
    const visited = new Uint8Array(2);
    const visit = vi.fn();
    const fill = () =>
      floodFill4({
        width: 2,
        height: 1,
        start: 0,
        tryVisit: index => {
          if (visited[index] === 1) {
            return false;
          }
          visited[index] = 1;
          return true;
        },
        onVisit: visit,
      });

    fill();
    visited.fill(0);
    fill();

    expect(visit).toHaveBeenCalledTimes(4);
  });
});
