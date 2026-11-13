import { act, renderHook } from '@testing-library/react';

import { useIdSelection } from './use-id-selection';

interface Item {
  readonly id: string;
  readonly label: string;
}

const ITEMS: readonly Item[] = [
  { id: 'a', label: 'Item A' },
  { id: 'b', label: 'Item B' },
  { id: 'c', label: 'Item C' },
];

describe('useIdSelection', () => {
  it('starts on the first item when no initial id is provided', () => {
    const { result } = renderHook(() => useIdSelection(ITEMS));

    expect(result.current.selectedId).toBe('a');
    expect(result.current.selectedItem).toEqual(ITEMS[0]);
    expect(result.current.selectedIndex).toBe(0);
  });

  it('selects an item by its stable id', () => {
    const { result } = renderHook(() => useIdSelection(ITEMS));

    act(() => result.current.selectId('c'));

    expect(result.current.selectedId).toBe('c');
    expect(result.current.selectedItem?.label).toBe('Item C');
    expect(result.current.selectedIndex).toBe(2);
  });

  it('keeps the selected item when the collection is reordered', () => {
    const { result, rerender } = renderHook(
      (props: { items: readonly Item[] }) => useIdSelection(props.items),
      { initialProps: { items: ITEMS } }
    );
    act(() => result.current.selectId('b'));

    rerender({ items: [ITEMS[2], ITEMS[1], ITEMS[0]] });

    expect(result.current.selectedId).toBe('b');
    expect(result.current.selectedIndex).toBe(1);
  });

  it('falls back to the first item when the selection is removed', () => {
    const { result, rerender } = renderHook(
      (props: { items: readonly Item[] }) => useIdSelection(props.items),
      { initialProps: { items: ITEMS } }
    );
    act(() => result.current.selectId('b'));

    rerender({ items: [ITEMS[0], ITEMS[2]] });

    expect(result.current.selectedId).toBe('a');
    expect(result.current.selectedIndex).toBe(0);
  });

  it('has no selected item for an empty collection', () => {
    const { result } = renderHook(() => useIdSelection([]));

    expect(result.current.selectedId).toBeUndefined();
    expect(result.current.selectedItem).toBeUndefined();
    expect(result.current.selectedIndex).toBe(-1);
  });

  it('selects the first item when the collection starts empty and becomes populated', () => {
    const { result, rerender } = renderHook(
      (props: { items: readonly Item[] }) => useIdSelection(props.items),
      { initialProps: { items: [] as readonly Item[] } }
    );

    rerender({ items: ITEMS });

    expect(result.current.selectedId).toBe('a');
    expect(result.current.selectedIndex).toBe(0);
  });
});
