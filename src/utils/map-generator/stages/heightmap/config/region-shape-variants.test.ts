import { REGION_SHAPES } from './region-shape';
import { regionShapeFor } from './region-shape-variants';

describe('regionShapeFor', () => {
  it('keeps the ordinary base recipe in the temperate class', () => {
    expect(regionShapeFor('ordinary', 'temperate', 1)).toBe(REGION_SHAPES.ordinary);
  });

  it('gives lagoon and fjord their own temperate variants', () => {
    expect(regionShapeFor('lagoon', 'temperate', 1)).not.toBe(REGION_SHAPES.lagoon);
    expect(regionShapeFor('fjord', 'temperate', 1)).not.toBe(REGION_SHAPES.fjord);
  });

  it('returns the base recipe when geology coupling is zero', () => {
    expect(regionShapeFor('lagoon', 'cold', 0)).toBe(REGION_SHAPES.lagoon);
    expect(regionShapeFor('fjord', 'warm', 0)).toBe(REGION_SHAPES.fjord);
  });

  it('turns a cold lagoon into many low skerries without a reef', () => {
    const shape = regionShapeFor('lagoon', 'cold', 1);

    expect(shape.cavityShare).toBe(0);
    expect(shape.buildsReef).toBe(false);
    expect(shape.maxForms).toBeGreaterThan(REGION_SHAPES.lagoon.maxForms);
    expect(shape.amplitudeFactor).toBeGreaterThan(REGION_SHAPES.lagoon.amplitudeFactor);
  });

  it('turns a temperate lagoon into barrier islands without a reef', () => {
    const shape = regionShapeFor('lagoon', 'temperate', 1);

    expect(shape.cavityShare).toBe(0);
    expect(shape.buildsReef).toBe(false);
    expect(shape.cavityFloorShare).toBe(0);
    expect(shape.amplitudeFactor).toBeGreaterThan(REGION_SHAPES.lagoon.amplitudeFactor);
  });

  it('keeps the atoll layout only for the warm lagoon', () => {
    expect(regionShapeFor('lagoon', 'warm', 1).buildsReef).toBe(true);
    expect(regionShapeFor('volcanic', 'warm', 1).buildsReef).toBe(false);
  });

  it('weakens the channels of a warm fjord and deepens the cold one', () => {
    const warm = regionShapeFor('fjord', 'warm', 1);
    const temperate = regionShapeFor('fjord', 'temperate', 1);
    const cold = regionShapeFor('fjord', 'cold', 1);

    expect(warm.chuteCount).toBeLessThan(temperate.chuteCount);
    expect(temperate.chuteCount).toBeLessThan(cold.chuteCount);
    expect(warm.amplitudeFactor).toBeLessThan(REGION_SHAPES.fjord.amplitudeFactor);
    expect(cold.chuteStrength).toBeGreaterThan(REGION_SHAPES.fjord.chuteStrength);
  });

  it('orders volcanic peaks from cold through temperate to warm', () => {
    const cold = regionShapeFor('volcanic', 'cold', 1);
    const temperate = regionShapeFor('volcanic', 'temperate', 1);
    const warm = regionShapeFor('volcanic', 'warm', 1);

    expect(cold.amplitudeFactor).toBeLessThan(temperate.amplitudeFactor);
    expect(temperate.amplitudeFactor).toBeLessThan(warm.amplitudeFactor);
  });

  it('blends numeric fields with intermediate coupling', () => {
    const shape = regionShapeFor('fjord', 'warm', 0.5);

    expect(shape.chuteCount).toBe(3);
    expect(shape.amplitudeFactor).toBeCloseTo(1.175);
    expect(shape.chuteStrength).toBeCloseTo(0.65);
  });

  it('switches discrete cavity fields at half coupling', () => {
    const below = regionShapeFor('lagoon', 'cold', 0.49);
    const at = regionShapeFor('lagoon', 'cold', 0.5);

    expect(below.buildsReef).toBe(true);
    expect(below.cavityShare).toBe(REGION_SHAPES.lagoon.cavityShare);
    expect(below.cavityFloorShare).toBe(REGION_SHAPES.lagoon.cavityFloorShare);
    expect(at.buildsReef).toBe(false);
    expect(at.cavityShare).toBe(0);
    expect(at.cavityFloorShare).toBe(0);
  });

  it('keeps every variant inside the form and shelf limits', () => {
    for (const type of ['ordinary', 'volcanic', 'lagoon', 'fjord'] as const) {
      for (const thermal of ['cold', 'temperate', 'warm'] as const) {
        const shape = regionShapeFor(type, thermal, 1);
        expect(shape.minForms).toBeLessThanOrEqual(shape.maxForms);
        expect(shape.shelfFactor).toBeGreaterThan(1);
        expect(shape.cavityShare).toBeGreaterThanOrEqual(0);
        expect(shape.cavityShare).toBeLessThanOrEqual(1);
      }
    }
  });
});
