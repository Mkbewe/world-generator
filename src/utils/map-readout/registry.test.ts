import { READOUT_DEFINITIONS } from './sources/manifest';
import { worldShapeReadout } from './sources/world-shape.readout';
import { createReadoutRegistry, DEFAULT_ONLY_LAYERS } from './registry';
import { createMapGenerator } from '../map-generator/pipeline/pipeline-factory';
import type { MapConfig } from '../map-generator/types';
import { LAYER_CATALOG } from '../map-layers';

describe('readout contract', () => {
  it('rejects duplicate readout ids', () => {
    expect(() => createReadoutRegistry([worldShapeReadout, worldShapeReadout])).toThrow(
      'Duplicate readout ID: world-shape'
    );
  });

  it('covers every catalog layer with a descriptor or an explicit default', () => {
    const registry = createReadoutRegistry(READOUT_DEFINITIONS);
    const catalogIds = LAYER_CATALOG.map(layer => layer.id);

    for (const layer of LAYER_CATALOG) {
      const definition = registry.get(layer.id);
      if (layer.readout) {
        expect(definition).toBeDefined();
        expect(definition?.kind).toBe(layer.kind);
      } else {
        expect(DEFAULT_ONLY_LAYERS).toContain(layer.id);
      }
    }
    expect(
      [...READOUT_DEFINITIONS.map(definition => definition.id), ...DEFAULT_ONLY_LAYERS].sort()
    ).toEqual([...catalogIds].sort());
  });

  it('keeps every raster byte-identical for the same seed and configuration', async () => {
    const config: MapConfig = {
      world: {
        dimensions: { widthMeters: 5, heightMeters: 5, sampleWidth: 5, sampleHeight: 5 },
        seed: 123,
        shape: 'disc',
      },
    };

    const first = await createMapGenerator().generate(config, {});
    const second = await createMapGenerator().generate(config, {});

    expect(first.context.state.worldMask).toEqual(second.context.state.worldMask);
    expect(first.context.state.macroRegionIdMap).toEqual(second.context.state.macroRegionIdMap);
    expect(first.context.state.heatZoneMap).toEqual(second.context.state.heatZoneMap);
    expect(first.context.state.moistureBaseMap).toEqual(second.context.state.moistureBaseMap);
    expect(first.context.state.oceanCurrentMap).toEqual(second.context.state.oceanCurrentMap);
    expect(first.context.state.oceanCurrentStrength).toEqual(
      second.context.state.oceanCurrentStrength
    );
    expect(first.context.state.heightmap).toEqual(second.context.state.heightmap);
    expect(first.context.state.provenanceMap).toEqual(second.context.state.provenanceMap);
    expect(first.context.state.geologyPlan?.regionOwnerMap).toEqual(
      second.context.state.geologyPlan?.regionOwnerMap
    );
    expect(first.context.state.geologyPlan?.regionBorderDistanceMap).toEqual(
      second.context.state.geologyPlan?.regionBorderDistanceMap
    );
  });
});
