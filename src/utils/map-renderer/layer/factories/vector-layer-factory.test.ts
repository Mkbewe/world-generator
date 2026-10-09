import {
  validateVectorLayerFactories,
  type VectorLayerFactory,
  type VectorLayerFactoryRegistry,
} from './vector-layer-factory';
import { LayerRegistry, layerRegistry } from '../layer-registry';

const geologyFactory: VectorLayerFactory = {
  id: 'geology',
  supports: () => true,
  create: () => {
    throw new Error('The validator never builds layers.');
  },
};

describe('validateVectorLayerFactories', () => {
  it('accepts a catalog whose vector layers all have factories', () => {
    const factories: VectorLayerFactoryRegistry = new Map([['geology', geologyFactory]]);

    expect(() => validateVectorLayerFactories(layerRegistry, factories)).not.toThrow();
  });

  it('rejects a vector layer without a factory', () => {
    expect(() => validateVectorLayerFactories(layerRegistry, new Map())).toThrow(
      'Missing vector layer factory: geology'
    );
  });

  it('rejects a factory registered under another layer ID', () => {
    const factories: VectorLayerFactoryRegistry = new Map([
      ['geology', { ...geologyFactory, id: 'noise' }],
    ]);

    expect(() => validateVectorLayerFactories(layerRegistry, factories)).toThrow(
      'Vector layer factory "noise" is registered under "geology"'
    );
  });

  it('ignores raster layers without factories', () => {
    const registry = new LayerRegistry([layerRegistry.get('world-shape')]);

    expect(() => validateVectorLayerFactories(registry, new Map())).not.toThrow();
  });
});
