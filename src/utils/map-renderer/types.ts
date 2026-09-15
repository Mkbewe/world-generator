import type { MapSize } from './layer';
import type { ViewportSize } from './viewport';
import type { MapBaseLayerId, MapInfo, MapRasters } from '../map-layers';

export type { MapBaseLayerId, MapInfo, MapRasters } from '../map-layers';

/** Immutable spatial data usable by layers and overlays. */
export interface SpatialMask {
  readonly size: MapSize;
  contains(x: number, y: number): boolean;
}

export interface MapMetadata {
  seed: string;
  shape: 'disc' | 'rectangle';
}

/** Everything the renderer needs to display an existing map. */
export interface MapSnapshotData extends MapSize {
  layers: MapRasters;
  info?: MapInfo;
}

export const OVERLAY_LAYERS = {
  'world-boundary': { label: 'World boundary', source: 'world-shape' },
} as const;

export type MapOverlayId = keyof typeof OVERLAY_LAYERS;

/** ID in declaration order, for iteration. */
export const OVERLAY_IDS = Object.keys(OVERLAY_LAYERS) as MapOverlayId[];

export interface MapLayerOption<TId extends string> {
  id: TId;
  label: string;
  available: boolean;
}

/** Raw value of the displayed layer at a source raster cell. */
export interface MapInspection {
  id: MapBaseLayerId;
  label: string;
  /** Undefined when the cell lies outside the layer's valid area. */
  value?: number;
}

export interface MapOverlayOption extends MapLayerOption<MapOverlayId> {
  visible: boolean;
}

export interface LayerLeafNode<TId extends string = MapBaseLayerId> {
  readonly id: TId;
  readonly label: string;
}

export interface LayerGroupNode<TId extends string = MapBaseLayerId> {
  readonly id: string;
  readonly label: string;
  readonly children: readonly LayerLeafNode<TId>[];
}

/** Layer tabs are raster leaves or a single-level group of leaves. */
export type LayerTreeNode<TId extends string = MapBaseLayerId> =
  LayerLeafNode<TId> | LayerGroupNode<TId>;

/** A preview node with readiness and the group's selected child. */
export interface MapLayerNode extends MapLayerOption<string> {
  readonly children?: readonly MapLayerNode[];
  readonly selectedChild?: MapBaseLayerId;
  /** Available raster leaf selected through this node's subtree. */
  readonly selectedLayer: MapBaseLayerId;
}

export interface MapLayerNavigation {
  readonly tabs: readonly MapLayerNode[];
  readonly activeTab?: string;
}

export interface RenderLayerStatistics {
  id: MapBaseLayerId;
  name: string;
  /** Synchronous preparation and tile drawing time, excluding browser yields. */
  durationMs: number;
  tiles: number;
  /** Pixels drawn in this run, including transparent pixels. */
  pixels: number;
  bytes: number;
}

export interface RenderStatistics {
  /** Wall-clock time from starting the run to this report, including waiting. */
  elapsedDurationMs: number;
  /** Time from starting the run to the first tile copied to the preview canvas. */
  firstTileDurationMs?: number;
  viewport?: ViewportSize;
  /** Cumulative synchronous overlay work in this run. */
  overlayDurationMs: number;
  /** Cumulative time copying complete layers to the preview canvas. */
  presentationDurationMs: number;
  layers: readonly RenderLayerStatistics[];
}
