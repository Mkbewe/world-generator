export {
  hasCurrentRasterOutputs,
  LAYER_CATALOG,
  RASTER_CATALOG,
  selectRasters,
} from './catalog/catalog';
export { compilePalette, HEIGHTMAP_STOPS, regionColor, validatePalette } from './palettes/palettes';
export type { PixelWriter } from './palettes/palettes';
export { CHARACTER_STYLES, characterStyle } from './palettes/characters';
export type { CharacterStyle } from './palettes/characters';
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
