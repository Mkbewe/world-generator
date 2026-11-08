import { geologyReadout } from './geology.readout';
import { heatZoneReadout } from './heat-zones.readout';
import { heightmapReadout } from './heightmap.readout';
import { macroRegionReadout } from './macro-region.readout';
import { moistureReadout } from './moisture.readout';
import { oceanCurrentReadout } from './ocean-currents.readout';
import { worldShapeReadout } from './world-shape.readout';

/** The only list a new readout joins; no dispatch branching lives here. */
export const READOUT_DEFINITIONS = [
  worldShapeReadout,
  macroRegionReadout,
  heatZoneReadout,
  moistureReadout,
  heightmapReadout,
  geologyReadout,
  oceanCurrentReadout,
] as const;
