export {
  hasCurrentRasterOutputs,
  LAYER_CATALOG,
  RASTER_CATALOG,
  selectRasters,
} from './catalog/catalog';
export {
  compilePalette,
  BASE_CLIMATE_ZONE_COLORS,
  GEOLOGY_REGION_PALETTES,
  geologyRegionColor,
  HEAT_ZONE_COLORS,
  heatZoneColor,
  HEIGHTMAP_STOPS,
  MOISTURE_STOPS,
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
