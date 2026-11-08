export {
  hasCurrentRasterOutputs,
  findOverlayDescriptor,
  LAYER_CATALOG,
  OVERLAY_CATALOG,
  OVERLAY_IDS,
  overlayDescriptor,
  RASTER_CATALOG,
  selectRasters,
} from './catalog/catalog';
export type { MapOverlayId, OverlayDescriptor } from './catalog/catalog';
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
export type {
  Color,
  DiscreteOverflow,
  LayerGroupSpec,
  LayerSpec,
  OverlaySpec,
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
