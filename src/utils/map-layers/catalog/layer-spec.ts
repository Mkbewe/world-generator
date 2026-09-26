export type Color = readonly [red: number, green: number, blue: number];

export interface RampStop {
  readonly at: number;
  readonly color: Color;
}

export type DiscreteOverflow = 'cycle' | { readonly color: Color };

export type PaletteSpec =
  | { readonly kind: 'solid'; readonly color: Color }
  | { readonly kind: 'ramp'; readonly stops: readonly RampStop[] }
  | {
      readonly kind: 'discrete';
      readonly colors: readonly Color[];
      readonly overflow: DiscreteOverflow;
      /** Added to the raster value before indexing; -1 maps 1-based rasters to the first color. */
      readonly offset?: number;
    };

export type RasterDataType = 'uint8' | 'float32';

export interface LayerGroupSpec {
  readonly id: string;
  readonly label: string;
}

/** Fields every catalog entry shares. */
interface LayerSpecBase<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
  /** Generator output this layer paints. */
  readonly source: string;
  readonly clipTo?: TId;
  readonly group?: LayerGroupSpec;
  /**
   * Extra non-raster info sources a vector layer reads besides its own
   * `source`, e.g. the layout behind the structure regions. They join the
   * cache key so a change rebuilds the layer.
   */
  readonly reads?: readonly string[];
}

/** Declarative description of one renderable raster. */
export interface RasterLayerSpec<TId extends string = string> extends LayerSpecBase<TId> {
  readonly kind: 'raster';
  readonly dataType: RasterDataType;
  /**
   * Analytic boundary classifier painted at screen resolution instead of cell
   * edges, so borders stay smooth at any zoom. The renderer resolves the
   * matching sampler from the map geometry.
   */
  readonly boundarySource?: 'region';
  /** Catalog layers whose rasters are sampled while painting this layer. */
  readonly samples?: readonly TId[];
  readonly providesMask?: { readonly insideValue: number };
  /** Cells holding this value stay transparent, e.g. "no structure" in an id map. */
  readonly skipValue?: number;
  readonly palette: PaletteSpec;
}

/**
 * Declarative description of one vector layer. Its source is a key of the map
 * info and its data is domain geometry instead of a typed array, so it has no
 * palette; the layer factory validates that data before building the layer.
 */
export interface VectorLayerSpec<TId extends string = string> extends LayerSpecBase<TId> {
  readonly kind: 'vector';
}

export type LayerSpec<TId extends string = string> = RasterLayerSpec<TId> | VectorLayerSpec<TId>;

export type RasterData = Uint8Array | Float32Array;

export type TypedArrayFor<T extends RasterDataType> = T extends 'uint8' ? Uint8Array : Float32Array;
