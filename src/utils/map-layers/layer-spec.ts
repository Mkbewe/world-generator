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
    };

export type RasterDataType = 'uint8' | 'float32';

export interface LayerGroupSpec {
  readonly id: string;
  readonly label: string;
}

/** Declarative description of one renderable raster. */
export interface LayerSpec {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly dataType: RasterDataType;
  readonly clipTo?: string;
  readonly providesMask?: { readonly insideValue: number };
  readonly group?: LayerGroupSpec;
  readonly palette: PaletteSpec;
}

export type RasterData = Uint8Array | Float32Array;

export type TypedArrayFor<T extends RasterDataType> = T extends 'uint8' ? Uint8Array : Float32Array;
