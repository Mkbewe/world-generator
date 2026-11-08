import type { MessageKey } from '../../i18n';
import type { WorldSpace } from '../map-generator/space';
import type { WorldDimensions } from '../world-dimensions';

export interface TranslatedText {
  readonly key: MessageKey;
  readonly params?: Readonly<Record<string, string | number | { readonly key: MessageKey }>>;
}

export interface PointerSample {
  /** Source raster cell under the pointer. */
  readonly x: number;
  readonly y: number;
  /** Normalized position within the source map, in the 0..1 range. */
  readonly u: number;
  readonly v: number;
}

export interface InspectorReadout {
  readonly position: PointerSample;
  readonly inspection?: ReadoutInspection;
  readonly overlays?: readonly ReadoutOverlayInspection[];
}

/** Ordered map points of a measurement; the preview is the next segment. */
export interface Measurement {
  readonly points: readonly PointerSample[];
  readonly preview?: PointerSample;
  /** True after the user finishes the path; pointer movement stops following. */
  readonly finished?: boolean;
}

/** Labelled pair of X/Y values rendered as aligned columns. */
export interface ReadoutLine {
  /** Column caption; omitted for a continuation of the line above. */
  readonly labelKey?: MessageKey;
  readonly x: string;
  readonly y: string;
}

/** Interactive entry rendered as a button instead of a label/value pair. */
export interface ReadoutAction {
  readonly id: string;
  readonly labelKey: MessageKey;
}

export interface ReadoutItem {
  readonly id: string;
  readonly labelKey: MessageKey;
  readonly value?: string | TranslatedText;
  /** When present, rendered as aligned X/Y columns instead of a single value. */
  readonly lines?: readonly ReadoutLine[];
  /** When present, rendered as a button. */
  readonly action?: ReadoutAction;
  /** When true, the entry ends its group and keeps a margin below it. */
  readonly separated?: boolean;
  /** When true, the entry starts a new group with a margin above it. */
  readonly detached?: boolean;
  /** When true, the entry is a small group heading without a value. */
  readonly heading?: boolean;
}

/** Named vector element under the pointer. */
export interface ReadoutHit {
  readonly id: string;
  readonly label?: string;
  readonly oceanCurrent?: { readonly angle: number; readonly strength: number };
}

/** Raster value of the displayed layer at a source cell. */
export interface RasterReadoutInspection {
  readonly kind: 'raster';
  readonly layerId: string;
  readonly labelKey: MessageKey;
  /** Undefined when the cell lies outside the layer's valid area. */
  readonly value?: number;
}

/** Vector element of the displayed layer at a source cell. */
export interface VectorReadoutInspection {
  readonly kind: 'vector';
  readonly layerId: string;
  readonly labelKey: MessageKey;
  /** Undefined when the pointer misses every element of the layer. */
  readonly hit?: ReadoutHit;
}

/** Sample of the displayed layer at a source raster cell. */
export type ReadoutInspection = RasterReadoutInspection | VectorReadoutInspection;

/** Named overlay value under the pointer, e.g. the BaseClimate heat zone. */
export interface ReadoutOverlayInspection {
  readonly overlayId: string;
  readonly value?: string;
  readonly oceanCurrent?: { readonly angle: number; readonly strength: number };
}

export interface ReadoutOptions {
  /** When false, action buttons are dropped, e.g. in the fullscreen preview. */
  readonly actions?: boolean;
}

/** Non-raster facts captured with the map. */
export type ReadoutInfo = Readonly<Record<string, unknown>>;

/** Everything a readout descriptor may consume besides its inspection. */
export interface ReadoutContext {
  readonly info: ReadoutInfo;
  /** Physical size captured with the map; absent when the map carries no dimensions. */
  readonly dimensions?: WorldDimensions;
  /** Shared coordinate frame of the map; absent when the map carries no dimensions. */
  readonly space?: WorldSpace;
  readonly options: ReadoutOptions;
}

/** One layer's cursor readout; the registry is the only dispatch point. */
export interface ReadoutDefinition {
  readonly id: string;
  readonly kind: 'raster' | 'vector';
  read(inspection: ReadoutInspection, context: ReadoutContext): readonly ReadoutItem[] | undefined;
}

export type RasterReadoutDescriber<TPayload> = (
  payload: TPayload,
  inspection: RasterReadoutInspection,
  context: ReadoutContext
) => readonly ReadoutItem[] | undefined;

export type VectorReadoutDescriber<TPayload> = (
  payload: TPayload,
  inspection: VectorReadoutInspection,
  context: ReadoutContext
) => readonly ReadoutItem[] | undefined;

/** Builds a raster readout; `parse` is the only MapInfo type guard per descriptor. */
export function defineRasterReadout<TPayload>(
  id: string,
  parse: (info: ReadoutInfo) => TPayload,
  describe: RasterReadoutDescriber<TPayload>
): ReadoutDefinition {
  return {
    id,
    kind: 'raster',
    read(inspection, context) {
      if (inspection.kind !== 'raster') {
        return undefined;
      }
      return describe(parse(context.info), inspection, context);
    },
  };
}

/** Builds a vector readout; `parse` is the only MapInfo type guard per descriptor. */
export function defineVectorReadout<TPayload>(
  id: string,
  parse: (info: ReadoutInfo) => TPayload,
  describe: VectorReadoutDescriber<TPayload>
): ReadoutDefinition {
  return {
    id,
    kind: 'vector',
    read(inspection, context) {
      if (inspection.kind !== 'vector') {
        return undefined;
      }
      return describe(parse(context.info), inspection, context);
    },
  };
}
