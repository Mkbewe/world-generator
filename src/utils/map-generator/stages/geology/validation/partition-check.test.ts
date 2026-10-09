import { checkPartition } from './partition-check';

function mask(values: readonly number[]): Uint8Array {
  return Uint8Array.from(values);
}

describe('checkPartition', () => {
  it('returns the cell count of every region', () => {
    const counts = checkPartition({
      owner: Int16Array.from([0, 0, 1, 1]),
      mask: mask([1, 1, 1, 1]),
      width: 4,
      height: 1,
      regionCount: 2,
    });

    expect([...counts]).toEqual([2, 2]);
  });

  it('rejects inside-world cells left without a region', () => {
    expect(() =>
      checkPartition({
        owner: Int16Array.from([0, -1, 1, 1]),
        mask: mask([1, 1, 1, 1]),
        width: 4,
        height: 1,
        regionCount: 2,
      })
    ).toThrow(/without a region/);
  });

  it('rejects owned cells outside the world mask', () => {
    expect(() =>
      checkPartition({
        owner: Int16Array.from([0, 0, 1, 0]),
        mask: mask([1, 1, 1, 0]),
        width: 4,
        height: 1,
        regionCount: 2,
      })
    ).toThrow(/outside the world mask/);
  });

  it('rejects a region with no cells', () => {
    expect(() =>
      checkPartition({
        owner: Int16Array.from([0, 0, 1, 1]),
        mask: mask([1, 1, 1, 1]),
        width: 4,
        height: 1,
        regionCount: 3,
      })
    ).toThrow(/got no cells/);
  });

  it('rejects a region split into components', () => {
    expect(() =>
      checkPartition({
        owner: Int16Array.from([0, 1, 0, 1]),
        mask: mask([1, 1, 1, 1]),
        width: 4,
        height: 1,
        regionCount: 2,
      })
    ).toThrow(/connected body/);
  });
});
