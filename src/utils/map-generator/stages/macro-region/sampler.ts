import { createRegionDisplacement } from './border-displacement';
import { DEFAULT_MACRO_DEFORMATION } from './defaults';
import { createMacroRegionSampler } from './stage';
import type { MacroRegionConfig, MacroRegionDeformation } from '../../types';

export interface MacroRegionClassifierInput {
  readonly seed: number;
  readonly regions: readonly MacroRegionConfig[];
  readonly deformation?: MacroRegionDeformation;
}

/**
 * The one place that rebuilds the macro-region border classifier. Preview code
 * passes geometry and the shared seed; it does not own the random stream.
 */
export function createMacroRegionClassifier(
  input: MacroRegionClassifierInput
): (x: number, y: number) => number {
  const deformation = input.deformation ?? DEFAULT_MACRO_DEFORMATION;
  return createMacroRegionSampler(input.regions, deformation, createRegionDisplacement(input.seed));
}
