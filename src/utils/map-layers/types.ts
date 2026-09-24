import type { LAYER_CATALOG } from './catalog';
import type { MapRasterOutputs } from '../map-generator/pipeline/stage-outputs';

type CatalogEntry = (typeof LAYER_CATALOG)[number];
export type MapBaseLayerId = CatalogEntry['id'];
export type LayerSource = CatalogEntry['source'];

/** Presentation view of the rasters the generator owns. */
export type MapRasters = MapRasterOutputs;

/** Loose representation used only where source keys are discovered at runtime. */
export type LayerDataRecord = Readonly<Record<string, unknown>>;

/** Non-raster information kept with the generated map, e.g. region labels or land definitions. */
export type MapInfo = Readonly<Record<string, unknown>>;
