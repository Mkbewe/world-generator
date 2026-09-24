export {
  hasCurrentRasterSources,
  LAYER_CATALOG,
  RASTER_CATALOG,
  selectRasters,
} from './catalog/catalog';
export { compilePalette, regionColor, validatePalette } from './palettes/palettes';
export type { PixelWriter } from './palettes/palettes';
export type {
  Color,
  DiscreteOverflow,
  LayerGroupSpec,
  LayerSpec,
  PaletteSpec,
  RampStop,
  RasterData,
  RasterDataType,
  RasterLayerSpec,
  TypedArrayFor,
  VectorLayerSpec,
} from './catalog/layer-spec';
export type {
  LayerDataRecord,
  LayerSource,
  MapBaseLayerId,
  MapInfo,
  MapRasters,
} from './catalog/types';
