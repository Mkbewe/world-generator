export { hasCurrentRasterSources, LAYER_CATALOG, RASTER_CATALOG, selectRasters } from './catalog';
export { compilePalette, regionColor, validatePalette } from './palettes';
export type { PixelWriter } from './palettes';
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
} from './layer-spec';
export type { LayerDataRecord, LayerSource, MapBaseLayerId, MapInfo, MapRasters } from './types';
