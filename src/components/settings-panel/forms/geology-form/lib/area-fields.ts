import {
  MAX_AREA_EXTENT,
  MAX_SEABED_OFFSET_METERS,
  MAX_SHELF_WIDTH_METERS,
  MAX_UPLIFT_SCALE_METERS,
  MIN_AREA_EXTENT,
  MIN_SEABED_OFFSET_METERS,
  MIN_SHELF_WIDTH_METERS,
  MIN_UPLIFT_SCALE_METERS,
} from '../../../../../utils/map-generator/stages/geology';
import type { TerrainCharacter } from '../../../../../utils/map-generator/types';

/** Area contract fields the card edits with a plain numeric slider. */
export type NumericAreaKey =
  | 'extent'
  | 'elongation'
  | 'upliftDensity'
  | 'upliftScaleMeters'
  | 'fragmentation'
  | 'seabedOffsetMeters'
  | 'shelfWidthMeters'
  | 'rimStrength';

export interface AreaSlider {
  readonly key: NumericAreaKey;
  readonly label: string;
  readonly description: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
  readonly rangeLabels?: readonly [minimum: string, maximum: string];
}

export const percent = (value: number): string => `${Math.round(value * 100)}%`;

export const meters = (value: number): string => `${Math.round(value)} m`;

/** Numeric contract fields, one slider each; the field order is the card order. */
export const AREA_SLIDERS: readonly AreaSlider[] = [
  {
    key: 'extent',
    label: 'Size',
    description:
      'How far the area reaches; the field fades out before this edge. A bigger area does not mean bigger islands.',
    min: MIN_AREA_EXTENT,
    max: MAX_AREA_EXTENT,
    step: 0.01,
    format: percent,
    rangeLabels: ['Small', 'Large'],
  },
  {
    key: 'elongation',
    label: 'Ellipticity',
    description: 'Shape of the area: 0 is a circle, 1 is a long oval stretched along its rotation.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
    rangeLabels: ['Round', 'Long'],
  },
  {
    key: 'upliftDensity',
    label: 'Uplift density',
    description: 'How much of the area tends to rise.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
    rangeLabels: ['Sparse', 'Dense'],
  },
  {
    key: 'upliftScaleMeters',
    label: 'Form size',
    description: 'Fine makes more, smaller uplifts; broad makes fewer, larger and smoother ones.',
    min: MIN_UPLIFT_SCALE_METERS,
    max: MAX_UPLIFT_SCALE_METERS,
    step: 50,
    format: meters,
    rangeLabels: ['Fine', 'Broad'],
  },
  {
    key: 'fragmentation',
    label: 'Fragmentation',
    description: 'Splits the rising ground into more, smaller uplifts.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
    rangeLabels: ['Whole', 'Broken'],
  },
  {
    key: 'seabedOffsetMeters',
    label: 'Seabed offset',
    description:
      'Raises or lowers the local sea floor: above 0 is shallower, below 0 is deeper. Land can still rise above it.',
    min: MIN_SEABED_OFFSET_METERS,
    max: MAX_SEABED_OFFSET_METERS,
    step: 10,
    format: meters,
    rangeLabels: ['Deeper', 'Shallower'],
  },
  {
    key: 'shelfWidthMeters',
    label: 'Shelf width',
    description: 'Widens the shallow fade around the area; 0 keeps a sharp edge.',
    min: MIN_SHELF_WIDTH_METERS,
    max: MAX_SHELF_WIDTH_METERS,
    step: 50,
    format: meters,
    rangeLabels: ['None', 'Wide'],
  },
  {
    key: 'rimStrength',
    label: 'Lagoon rim',
    description: 'Builds a shallow ring around a sunken centre, like an atoll.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
    rangeLabels: ['None', 'Atoll'],
  },
];

export const RELIEFS: readonly { readonly value: TerrainCharacter; readonly label: string }[] = [
  { value: 'plains', label: 'Plains' },
  { value: 'hills', label: 'Hills' },
  { value: 'mountains', label: 'Mountains' },
];

/**
 * One numeric field as a patch. A computed key of a union type does not narrow
 * to the matching object shape, so the patch is built through a typed record.
 */
export function numericPatch(
  key: NumericAreaKey,
  value: number
): Partial<Record<NumericAreaKey, number>> {
  const patch: Partial<Record<NumericAreaKey, number>> = {};
  patch[key] = value;
  return patch;
}
