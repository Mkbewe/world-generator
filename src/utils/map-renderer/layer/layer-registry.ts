import { LAYER_DEFINITIONS, type LayerDefinition } from './layer-definition';
import type { MapBaseLayerId, MapLayers } from '../types';

/** A validated catalog whose iteration order respects layer dependencies. */
export class LayerRegistry {
  readonly ids: readonly MapBaseLayerId[];
  private readonly definitions: ReadonlyMap<MapBaseLayerId, LayerDefinition>;

  constructor(definitions: Readonly<Record<string, LayerDefinition>>) {
    this.definitions = new Map(Object.entries(definitions));
    const sources = new Set<string>();
    for (const [id, definition] of this.definitions) {
      if (sources.has(definition.source)) {
        throw new Error('Duplicate layer source: ' + definition.source);
      }
      if ((definition.requires ?? []).includes(id)) {
        throw new Error('Cyclic layer dependency: ' + id);
      }
      sources.add(definition.source);
    }
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

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  get(id: MapBaseLayerId): LayerDefinition {
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
