import { landmassLayoutVectorLayerFactory } from './landmass-layout-vector-layer';
import { structureCharacterVectorLayerFactory } from './structure-character-vector-layer';
import type { VectorLayerFactoryRegistry } from './vector-layer-factory';

/** Vector layers built into the renderer; a scene may receive its own registry. */
export const vectorLayerFactories: VectorLayerFactoryRegistry = new Map([
  [landmassLayoutVectorLayerFactory.id, landmassLayoutVectorLayerFactory],
  [structureCharacterVectorLayerFactory.id, structureCharacterVectorLayerFactory],
]);
