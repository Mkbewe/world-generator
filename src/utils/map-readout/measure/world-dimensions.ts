import { isWorldDimensions, type WorldDimensions } from '../../world-dimensions';
import type { ReadoutInfo } from '../contracts';

/** Reads the world dimensions captured with the generated map, if they are well formed. */
export function worldDimensions(info: ReadoutInfo): WorldDimensions | undefined {
  const value: unknown = info.worldDimensions;
  return isWorldDimensions(value) ? value : undefined;
}
