export {
  hasCurrentRasterOutputs,
  LAYER_CATALOG,
  RASTER_CATALOG,
  selectRasters,
} from './catalog/catalog';
export {
  compilePalette,
  GEOLOGY_REGION_PALETTES,
  geologyRegionColor,
  regionColor,
  validatePalette,
} from './palettes/palettes';
export type { PixelWriter } from './palettes/palettes';
export { REGION_STYLES, regionStyle } from './palettes/regions';
export type { RegionStyle } from './palettes/regions';
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
