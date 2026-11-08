import { HeatZoneOverlayRenderer } from './heat-zone-overlay-renderer';
import {
  HeatZoneOverlayInspector,
  MoistureOverlayInspector,
  OceanCurrentOverlayInspector,
  type OverlayInspector,
} from './inspection';
import { MoistureOverlayRenderer } from './moisture-overlay-renderer';
import { OceanCurrentOverlayRenderer } from './ocean-current-overlay-renderer';
import type { OverlayRenderer } from './overlay-renderer';
import { WorldBoundaryOverlayRenderer } from './world-boundary-overlay-renderer';
import type { MapOverlayId } from '../../types';
import { WorldBoundaryRenderer } from '../../world-boundary-renderer';

/** One overlay's implementations; ordering is painter order. */
export interface OverlayComponentFactory {
  readonly id: MapOverlayId;
  createRenderer(canvas: HTMLCanvasElement): OverlayRenderer;
  createInspector?(): OverlayInspector;
}

/** The only registry of overlay implementations; metadata lives in the catalog. */
export const OVERLAY_COMPONENTS = [
  {
    id: 'heat-zones',
    createRenderer: () => new HeatZoneOverlayRenderer(),
    createInspector: () => new HeatZoneOverlayInspector(),
  },
  {
    id: 'moisture',
    createRenderer: () => new MoistureOverlayRenderer(),
    createInspector: () => new MoistureOverlayInspector(),
  },
  {
    id: 'ocean-currents',
    createRenderer: () => new OceanCurrentOverlayRenderer(),
    createInspector: () => new OceanCurrentOverlayInspector(),
  },
  {
    id: 'world-boundary',
    createRenderer: canvas => new WorldBoundaryOverlayRenderer(new WorldBoundaryRenderer(canvas)),
  },
] as const satisfies readonly OverlayComponentFactory[];
