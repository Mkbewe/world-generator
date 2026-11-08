import type { ReadoutDefinition } from './contracts';

/**
 * Catalog layers intentionally left to the generic default item. Every other
 * layer must ship a descriptor, or a new layer would silently lose its readout.
 */
export const DEFAULT_ONLY_LAYERS: readonly string[] = [];

/** Lookup port for readout descriptors; assembly happens in the composition root. */
export interface ReadoutRegistry {
  readonly definitions: readonly ReadoutDefinition[];
  get(id: string): ReadoutDefinition | undefined;
}

export function createReadoutRegistry(definitions: readonly ReadoutDefinition[]): ReadoutRegistry {
  const byId = new Map<string, ReadoutDefinition>();
  for (const definition of definitions) {
    if (byId.has(definition.id)) {
      throw new Error(`Duplicate readout ID: ${definition.id}`);
    }
    byId.set(definition.id, definition);
  }
  return {
    definitions,
    get: id => byId.get(id),
  };
}
