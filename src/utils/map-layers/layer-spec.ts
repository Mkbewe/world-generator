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

/** Declarative description of one renderable raster. */
export interface LayerSpec<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
  readonly source: string;
  readonly dataType: RasterDataType;
  readonly clipTo?: TId;
  /**
   * Analytic boundary classifier painted at screen resolution instead of cell
   * edges, so borders stay smooth at any zoom. The renderer resolves the
   * matching sampler from the map geometry.
   */
  readonly boundarySource?: 'region' | 'landmass';
  /** Catalog layers whose rasters are sampled while painting this layer. */
  readonly samples?: readonly TId[];
  readonly providesMask?: { readonly insideValue: number };
  /** Cells holding this value stay transparent, e.g. "no structure" in an id map. */
  readonly skipValue?: number;
  readonly group?: LayerGroupSpec;
  readonly palette: PaletteSpec;
}

export type RasterData = Uint8Array | Float32Array;

export type TypedArrayFor<T extends RasterDataType> = T extends 'uint8' ? Uint8Array : Float32Array;
