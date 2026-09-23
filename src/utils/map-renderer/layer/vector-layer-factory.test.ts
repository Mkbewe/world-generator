import { LayerRegistry, layerRegistry } from './layer-registry';
import {
  validateVectorLayerFactories,
  type VectorLayerFactory,
  type VectorLayerFactoryRegistry,
} from './vector-layer-factory';

const landmassFactory: VectorLayerFactory = {
  id: 'landmass-layout',
  supports: () => true,
  create: () => {
    throw new Error('The validator never builds layers.');
  },
};

describe('validateVectorLayerFactories', () => {
  it('accepts a catalog whose vector layers all have factories', () => {
    const factories: VectorLayerFactoryRegistry = new Map([['landmass-layout', landmassFactory]]);

    expect(() => validateVectorLayerFactories(layerRegistry, factories)).not.toThrow();
  });

  it('rejects a vector layer without a factory', () => {
    expect(() => validateVectorLayerFactories(layerRegistry, new Map())).toThrow(
      'Missing vector layer factory: landmass-layout'
    );
  });

  it('rejects a factory registered under another layer ID', () => {
    const factories: VectorLayerFactoryRegistry = new Map([
      ['landmass-layout', { ...landmassFactory, id: 'noise' }],
    ]);

    expect(() => validateVectorLayerFactories(layerRegistry, factories)).toThrow(
      'Vector layer factory "noise" is registered under "landmass-layout"'
    );
  });

  it('ignores raster layers without factories', () => {
    const registry = new LayerRegistry([layerRegistry.get('world-shape')]);

    expect(() => validateVectorLayerFactories(registry, new Map())).not.toThrow();
  });
});
