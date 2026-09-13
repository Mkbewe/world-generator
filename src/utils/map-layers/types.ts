import type { LAYER_CATALOG } from './catalog';
import type { TypedArrayFor } from './layer-spec';

export type CatalogEntry = (typeof LAYER_CATALOG)[number];
export type MapBaseLayerId = CatalogEntry['id'];
export type LayerSource = CatalogEntry['source'];

export type MapRasters = Partial<{
  [Entry in CatalogEntry as Entry['source']]: TypedArrayFor<Entry['dataType']>;
}>;

/** Loose representation used only where source keys are discovered at runtime. */
export type LayerDataRecord = Readonly<Record<string, unknown>>;
