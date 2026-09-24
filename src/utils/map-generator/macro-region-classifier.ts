import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_REGION_NOISE_SOURCE,
} from './stages/macro-region-defaults';
import { createRegionDisplacement, type NoiseSampler } from './stages/macro-region-displacement';
import { createMacroRegionSampler } from './stages/macro-region-stage';
import type { MacroRegionConfig, MacroRegionDeformation } from './types';

export interface MacroRegionClassifierInput {
  readonly seed: number;
  readonly regions: readonly MacroRegionConfig[];
  readonly deformation?: MacroRegionDeformation;
  readonly width: number;
  readonly height: number;
  readonly noiseAt?: NoiseSampler;
}

/**
 * The one place that rebuilds the macro-region border classifier. Preview code
 * passes geometry and an optional noise sample; it does not own the random stream.
 */
export function createMacroRegionClassifier(
  input: MacroRegionClassifierInput
): (x: number, y: number) => number {
  const deformation = input.deformation ?? DEFAULT_MACRO_DEFORMATION;
  const source = deformation.source ?? DEFAULT_REGION_NOISE_SOURCE;
  return createMacroRegionSampler(
    input.regions,
    deformation,
    createRegionDisplacement({
      source,
      seed: input.seed,
      width: input.width,
      height: input.height,
      noiseAt: source === 'noise-map' ? input.noiseAt : undefined,
    })
  );
}
