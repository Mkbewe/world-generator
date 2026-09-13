import {
  LAYER_DEFINITIONS,
  type LayerDefinition,
  type RasterLayerDefinition,
} from './layer-definition';
import type { LayerLeafNode, LayerTreeNode, MapBaseLayerId, MapLayers } from '../types';

/** Validates the definition tree and orders its raster leaves by data dependencies. */
export class LayerRegistry {
  readonly ids: readonly MapBaseLayerId[];
  readonly tree: readonly LayerTreeNode[];
  private readonly definitions = new Map<MapBaseLayerId, RasterLayerDefinition>();

  constructor(definitions: Readonly<Record<string, LayerDefinition>>) {
    const nodeIds = new Set<string>();
    const sources = new Set<string>();
    const registerLeaf = (id: string, definition: RasterLayerDefinition): LayerLeafNode => {
      if ('children' in definition) {
        throw new Error('Nested layer groups are not supported: ' + id);
      }
      if (nodeIds.has(id)) {
        throw new Error('Duplicate layer ID: ' + id);
      }
      nodeIds.add(id);
      if (sources.has(definition.source)) {
        throw new Error('Duplicate layer source: ' + definition.source);
      }
      sources.add(definition.source);
      this.definitions.set(id, definition);
      return { id, label: definition.label };
    };
    this.tree = Object.entries(definitions).map(([id, definition]): LayerTreeNode => {
      if (!('children' in definition)) {
        return registerLeaf(id, definition);
      }
      if (nodeIds.has(id)) {
        throw new Error('Duplicate layer ID: ' + id);
      }
      nodeIds.add(id);
      const children = Object.entries(definition.children);
      if (children.length === 0) {
        throw new Error('Empty layer group: ' + id);
      }
      return {
        id,
        label: definition.label,
        children: children.map(([childId, child]) => registerLeaf(childId, child)),
      };
    });

    const ordered: MapBaseLayerId[] = [];
    const visited = new Set<MapBaseLayerId>();
    const visiting = new Set<MapBaseLayerId>();
    const visit = (id: MapBaseLayerId): void => {
      if (visiting.has(id)) {
        throw new Error('Cyclic layer dependency: ' + id);
      }
      if (visited.has(id)) {
        return;
      }
      const definition = this.get(id);
      visiting.add(id);
      for (const dependency of definition.requires ?? []) {
        visit(dependency);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(id);
    };
    for (const id of this.definitions.keys()) {
      visit(id);
    }
    this.ids = ordered;
  }

  /** Whether a raster leaf is registered. Groups have no raster data. */
  has(id: string): boolean {
    return this.definitions.has(id);
  }

  get(id: MapBaseLayerId): RasterLayerDefinition {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new Error('Unknown layer: ' + id);
    }
    return definition;
  }

  presentIn(data: MapLayers): readonly MapBaseLayerId[] {
    return this.ids.filter(id => {
      const source = this.get(id).source;
      return Object.hasOwn(data, source) && data[source] !== undefined;
    });
  }
}

export const layerRegistry = new LayerRegistry(LAYER_DEFINITIONS);
