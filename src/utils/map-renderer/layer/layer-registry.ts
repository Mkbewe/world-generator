import {
  LAYER_CATALOG,
  type LayerDataRecord,
  type LayerSpec,
  validatePalette,
} from '../../map-layers';
import type { LayerLeafNode, LayerTreeNode, MapBaseLayerId } from '../types';

/** Validates the raster catalog and exposes independent UI and build orders. */
export class LayerRegistry {
  readonly order: readonly MapBaseLayerId[];
  readonly buildOrder: readonly MapBaseLayerId[];
  readonly tree: readonly LayerTreeNode[];
  private readonly specs = new Map<string, LayerSpec>();

  constructor(catalog: readonly LayerSpec[]) {
    const sources = new Set<string>();
    for (const spec of catalog) {
      if (!spec.id || !spec.source) {
        throw new Error('Layer ID and source must not be empty.');
      }
      if (this.specs.has(spec.id)) {
        throw new Error('Duplicate layer ID: ' + spec.id);
      }
      if (sources.has(spec.source)) {
        throw new Error('Duplicate layer source: ' + spec.source);
      }
      validatePalette(spec.palette);
      validateMaskValue(spec);
      this.specs.set(spec.id, spec);
      sources.add(spec.source);
    }

    const layerIds = new Set(this.specs.keys());
    const groups = new Map<string, { label: string; children: LayerLeafNode[] }>();
    const tree: LayerTreeNode[] = [];
    for (const spec of catalog) {
      const leaf = { id: spec.id as MapBaseLayerId, label: spec.label };
      if (!spec.group) {
        tree.push(leaf);
        continue;
      }
      if (layerIds.has(spec.group.id)) {
        throw new Error('Layer group ID collides with a layer ID: ' + spec.group.id);
      }
      const existing = groups.get(spec.group.id);
      if (existing) {
        if (existing.label !== spec.group.label) {
          throw new Error('Inconsistent layer group label: ' + spec.group.id);
        }
        existing.children.push(leaf);
        continue;
      }
      const group = { label: spec.group.label, children: [leaf] };
      groups.set(spec.group.id, group);
      tree.push({ id: spec.group.id, label: group.label, children: group.children });
    }
    this.tree = tree;
    this.order = catalog.map(spec => spec.id as MapBaseLayerId);

    for (const spec of catalog) {
      if (!spec.clipTo) {
        continue;
      }
      const mask = this.specs.get(spec.clipTo);
      if (!mask) {
        throw new Error('Unknown layer: ' + spec.clipTo);
      }
      if (!mask.providesMask) {
        throw new Error(`Layer "${spec.id}" cannot clip to non-mask layer "${spec.clipTo}".`);
      }
    }

    const ordered: MapBaseLayerId[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): void => {
      if (visiting.has(id)) {
        throw new Error('Cyclic layer dependency: ' + id);
      }
      if (visited.has(id)) {
        return;
      }
      const spec = this.get(id);
      visiting.add(id);
      if (spec.clipTo) {
        visit(spec.clipTo);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(id as MapBaseLayerId);
    };
    for (const spec of catalog) {
      visit(spec.id);
    }
    this.buildOrder = ordered;
  }

  has(id: string): boolean {
    return this.specs.has(id);
  }

  get(id: string): LayerSpec {
    const spec = this.specs.get(id);
    if (!spec) {
      throw new Error('Unknown layer: ' + id);
    }
    return spec;
  }

  presentIn(data: LayerDataRecord): readonly MapBaseLayerId[] {
    return this.buildOrder.filter(id => {
      const source = this.get(id).source;
      return Object.hasOwn(data, source) && data[source] !== undefined;
    });
  }
}

export const layerRegistry = new LayerRegistry(LAYER_CATALOG);

function validateMaskValue(spec: LayerSpec): void {
  const value = spec.providesMask?.insideValue;
  if (value === undefined) {
    return;
  }
  const valid =
    spec.dataType === 'uint8'
      ? Number.isInteger(value) && value >= 0 && value <= 255
      : Number.isFinite(value);
  if (!valid) {
    throw new Error(`Layer "${spec.id}" has an invalid mask inside value.`);
  }
}
