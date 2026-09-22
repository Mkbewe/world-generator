import { hasCurrentRasterSources, LAYER_CATALOG } from './catalog';
import { PIPELINE_STAGES } from '../map-generator/stage-definitions';

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
});
