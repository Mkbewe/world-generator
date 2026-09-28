import { dominantAreaId, type FieldContribution, mergeContributions } from './merge';

function contribution(areaId: string, heightMeters: number): FieldContribution {
  return { areaId, heightMeters };
}

describe('mergeContributions', () => {
  it('keeps a single contribution exact', () => {
    expect(mergeContributions([contribution('a', 100)])).toBe(100);
    expect(mergeContributions([contribution('a', -60)])).toBe(-60);
  });

  it('unions equal lifts quadratically', () => {
    expect(mergeContributions([contribution('a', 100), contribution('b', 100)])).toBeCloseTo(
      141.421356,
      5
    );
    expect(
      mergeContributions([contribution('a', 100), contribution('b', 100), contribution('c', 100)])
    ).toBeCloseTo(173.205081, 5);
  });

  it('cancels a lift against a depression', () => {
    expect(mergeContributions([contribution('a', 100), contribution('b', -60)])).toBeCloseTo(
      40,
      10
    );
  });

  it('does not depend on the contribution order', () => {
    const values = [contribution('a', 120), contribution('b', 45), contribution('c', -30)];
    const reversed = [...values].reverse();
    expect(mergeContributions(reversed)).toBeCloseTo(mergeContributions(values), 10);
  });

  it('bounds many overlapping areas well below the plain sum', () => {
    const many = Array.from({ length: 100 }, (_, index) => contribution(`a${index}`, 100));
    expect(mergeContributions(many)).toBeCloseTo(1000, 10);
  });

  it('returns zero for no contributions', () => {
    expect(mergeContributions([])).toBe(0);
  });
});

describe('dominantAreaId', () => {
  it('picks the strongest contribution by absolute height', () => {
    expect(
      dominantAreaId([contribution('a', 40), contribution('b', -120), contribution('c', 90)])
    ).toBe('b');
  });

  it('breaks ties on the smallest id regardless of order', () => {
    expect(dominantAreaId([contribution('b', 50), contribution('a', 50)])).toBe('a');
    expect(dominantAreaId([contribution('a', -50), contribution('b', -50)])).toBe('a');
  });

  it('treats zero as no contribution', () => {
    expect(dominantAreaId([])).toBeUndefined();
    expect(dominantAreaId([contribution('a', 0)])).toBeUndefined();
  });
});
