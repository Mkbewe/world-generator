import type { HeatZoneConfig, MacroRegionConfig, MacroRegionDeformation } from '@generator';
import type { MapInfo, MapRasters } from '@layers';

import type { WorldShape } from './world-shape';

export interface WorldSnapshotDimensionsMeters {
  widthMeters: number;
  heightMeters: number;
}

export interface WorldSnapshotRegionGeometry {
  seed: number;
  regions: readonly MacroRegionConfig[];
  deformation: MacroRegionDeformation;
}

export interface WorldSnapshotBaseClimateGeometry {
  seed: number;
  zones: readonly HeatZoneConfig[];
  zoneIrregularity: number;
}

export interface WorldSnapshotMetadata {
  seed: string;
  shape: WorldShape;
  dimensionsMeters?: WorldSnapshotDimensionsMeters;
  regionGeometry?: WorldSnapshotRegionGeometry;
  baseClimateGeometry?: WorldSnapshotBaseClimateGeometry;
}

export interface WorldSnapshotData extends WorldSnapshotMetadata {
  width: number;
  height: number;
  layers: MapRasters;
  info?: MapInfo;
}
