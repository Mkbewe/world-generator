import { hasCurrentRasterOutputs, LAYER_CATALOG, RASTER_CATALOG } from './catalog';
import { PIPELINE_STAGES } from '../../map-generator/pipeline/stage-definitions';
import { RASTER_OUTPUT_KEYS } from '../../map-generator/pipeline/stage-outputs';

describe('LAYER_CATALOG', () => {
  it('orders stage layers by the pipeline stage order', () => {
    const rank = new Map<string, number>(PIPELINE_STAGES.map((stage, index) => [stage.id, index]));
    const ranks = LAYER_CATALOG.map(layer => rank.get(layer.id)).filter(
      (value): value is number => value !== undefined
    );

    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
  });

  it('accepts persistent raster keys with no preview layer', () => {
    expect(hasCurrentRasterOutputs({})).toBe(true);
    expect(hasCurrentRasterOutputs({ worldMask: new Uint8Array(1) })).toBe(true);
    // Provenance has no catalog layer yet stays a current output.
    expect(hasCurrentRasterOutputs({ provenanceMap: new Int16Array(1) })).toBe(true);
    // A key from an older snapshot format makes the whole record stale.
    expect(hasCurrentRasterOutputs({ landmassIdMap: new Uint8Array(1) })).toBe(false);
  });

  it('keeps the vector layer out of the raster sources', () => {
    const entry = LAYER_CATALOG.find(layer => layer.id === 'landmass-layout');

    expect(entry?.kind).toBe('vector');
    expect(RASTER_CATALOG.map(layer => layer.id)).not.toContain('landmass-layout');
  });

  it('groups the structure character under the landmass tab', () => {
    const landmass = LAYER_CATALOG.find(layer => layer.id === 'landmass-layout');
    const character = LAYER_CATALOG.find(layer => layer.id === 'structure-character');

    expect(character?.kind).toBe('vector');
    expect(character?.source).toBe('structureZones');
    expect(character?.group).toEqual({ id: 'landmass', label: 'Landmasses' });
    expect(landmass?.group?.id).toBe('landmass');
    expect(RASTER_CATALOG.map(layer => layer.id)).not.toContain('structure-character');
  });

  it('hides the legacy corridor layers from the preview navigation', () => {
    const hidden = LAYER_CATALOG.filter(layer => 'hidden' in layer && layer.hidden).map(
      layer => layer.id
    );

    expect(hidden).toEqual(['landmass-layout', 'structure-character']);
  });

  it('sources every raster layer from a generator raster output', () => {
    const outputs = new Set<string>([...RASTER_OUTPUT_KEYS]);

    expect(RASTER_CATALOG.length).toBeGreaterThan(0);
    for (const spec of RASTER_CATALOG) {
      expect(outputs.has(spec.source)).toBe(true);
    }
  });

  it('adds the heightmap as a clipped float raster with the hypsometric ramp', () => {
    const heightmap = RASTER_CATALOG.find(layer => layer.id === 'heightmap');

    expect(heightmap?.source).toBe('heightmap');
    expect(heightmap?.dataType).toBe('float32');
    expect(heightmap?.clipTo).toBe('world-shape');
    expect(heightmap?.palette.kind).toBe('ramp');
  });
});
