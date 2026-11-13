import { useCallback, useState } from 'react';

export interface IdSelection<T extends { readonly id: string }> {
  readonly selectedId?: string;
  readonly selectedItem?: T;
  /** Zero-based index of the selected item, or -1 for an empty collection. */
  readonly selectedIndex: number;
  selectId(id: string): void;
}

/**
 * Selects an item from a local collection by its stable id. A removed or
 * unknown selection falls back to the first item; an empty collection has
 * index -1 and no selected item.
 */
export function useIdSelection<T extends { readonly id: string }>(
  items: readonly T[],
  initialId?: string
): IdSelection<T> {
  const [preferredId, setPreferredId] = useState(initialId ?? items[0]?.id);
  const found = items.findIndex(item => item.id === preferredId);
  let selectedIndex = -1;
  if (found >= 0) {
    selectedIndex = found;
  } else if (items.length > 0) {
    selectedIndex = 0;
  }
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;
  const selectId = useCallback((id: string) => setPreferredId(id), []);

  return {
    selectedId: selectedItem?.id,
    selectedItem,
    selectedIndex,
    selectId,
  };
}
