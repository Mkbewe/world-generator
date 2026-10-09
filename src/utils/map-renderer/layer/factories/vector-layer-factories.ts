import type { VectorLayerFactoryRegistry } from './vector-layer-factory';
import { geologyPlanVectorLayerFactory } from '../geology/geology-plan-vector-layer';

/** Vector layers built into the renderer; a scene may receive its own registry. */
export const vectorLayerFactories: VectorLayerFactoryRegistry = new Map([
  [geologyPlanVectorLayerFactory.id, geologyPlanVectorLayerFactory],
]);
