import type { LAYER_CATALOG } from './catalog';
import type { TypedArrayFor } from './layer-spec';

type CatalogEntry = (typeof LAYER_CATALOG)[number];
type RasterEntry = Extract<CatalogEntry, { kind: 'raster' }>;
export type MapBaseLayerId = CatalogEntry['id'];
export type LayerSource = CatalogEntry['source'];

export type MapRasters = Partial<{
  [Entry in RasterEntry as Entry['source']]: TypedArrayFor<Entry['dataType']>;
}>;

/** Loose representation used only where source keys are discovered at runtime. */
export type LayerDataRecord = Readonly<Record<string, unknown>>;

/** Non-raster information kept with the generated map, e.g. region labels or land definitions. */
export type MapInfo = Readonly<Record<string, unknown>>;
