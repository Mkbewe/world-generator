import { cellAtPixel } from './cell-at-pixel';

describe('cellAtPixel', () => {
  const size = { width: 3, height: 2 };

  it('maps pixel centres to flat cell indices', () => {
    expect(cellAtPixel({ cellSize: 2, left: 10, top: 20, width: 6, height: 4 }, size, 10, 20)).toBe(
      0
    );
    expect(cellAtPixel({ cellSize: 2, left: 10, top: 20, width: 6, height: 4 }, size, 14, 22)).toBe(
      5
    );
  });

  it('returns -1 for pixels outside each map boundary', () => {
    const projection = { cellSize: 1, left: 4, top: 7, width: 3, height: 2 };

    expect(cellAtPixel(projection, size, 3, 7)).toBe(-1);
    expect(cellAtPixel(projection, size, 7, 7)).toBe(-1);
    expect(cellAtPixel(projection, size, 4, 6)).toBe(-1);
    expect(cellAtPixel(projection, size, 4, 9)).toBe(-1);
  });
});
