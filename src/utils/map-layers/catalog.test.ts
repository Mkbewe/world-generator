import { hasCurrentRasterSources, LAYER_CATALOG, RASTER_CATALOG } from './catalog';
import { PIPELINE_STAGES } from '../map-generator/pipeline/stage-definitions';
import { RASTER_OUTPUT_KEYS } from '../map-generator/pipeline/stage-outputs';

describe('LAYER_CATALOG', () => {
  it('orders stage layers by the pipeline stage order', () => {
    const rank = new Map(PIPELINE_STAGES.map((stage, index) => [stage.id, index]));
    const ranks = LAYER_CATALOG.map(layer => rank.get(layer.id)).filter(
      (value): value is number => value !== undefined
    );

    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
  });

  it('accepts only raster keys of the current catalog', () => {
    expect(hasCurrentRasterSources({})).toBe(true);
    expect(hasCurrentRasterSources({ worldMask: new Uint8Array(1) })).toBe(true);
    // A key from an older snapshot format makes the whole record stale.
    expect(hasCurrentRasterSources({ landmassIdMap: new Uint8Array(1) })).toBe(false);
  });

  it('keeps the vector layer out of the raster sources', () => {
    const entry = LAYER_CATALOG.find(layer => layer.id === 'landmass-layout');

    expect(entry?.kind).toBe('vector');
    expect(RASTER_CATALOG.map(layer => layer.id)).not.toContain('landmass-layout');
  });

  it('sources every raster layer from a generator raster output', () => {
    const outputs = new Set<string>([...RASTER_OUTPUT_KEYS]);

    expect(RASTER_CATALOG.length).toBeGreaterThan(0);
    for (const spec of RASTER_CATALOG) {
      expect(outputs.has(spec.source)).toBe(true);
    }
  });
});
