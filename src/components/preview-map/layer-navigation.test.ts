import { LayerNavigation } from './layer-navigation';
import type { LayerTreeNode } from '../../utils/map-renderer';

const tree: readonly LayerTreeNode[] = [
  { id: 'world-shape', label: 'World shape' },
  {
    id: 'climate',
    label: 'Climate',
    children: [
      { id: 'temperature', label: 'Temperature' },
      { id: 'moisture', label: 'Moisture' },
    ],
  },
  { id: 'noise', label: 'Noise' },
];

const layers = ['world-shape', 'temperature', 'moisture', 'noise'].map(id => ({
  id,
  label: id,
  available: true,
}));

describe('LayerNavigation', () => {
  it('selects the first child of a group by default', () => {
    const navigation = new LayerNavigation(tree);

    expect(
      layers.filter(layer => navigation.leadsToSelection(layer.id)).map(layer => layer.id)
    ).toEqual(['world-shape', 'temperature', 'noise']);
  });

  it('remembers a selected child for automatic previews', () => {
    const navigation = new LayerNavigation(tree);
    navigation.select('moisture');

    const state = navigation.toViewState(layers, 'moisture');
    expect(state.activeTab).toBe('climate');
    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'moisture',
      selectedLayer: 'moisture',
    });
    expect(
      layers.filter(layer => navigation.leadsToSelection(layer.id)).map(layer => layer.id)
    ).toEqual(['world-shape', 'moisture', 'noise']);

    navigation.select('world-shape');
    expect(navigation.toViewState(layers).tabs[1].selectedLayer).toBe('moisture');
  });

  it('restores remembered selections from saved view state', () => {
    const navigation = new LayerNavigation(tree);
    navigation.select('moisture');
    const saved = navigation.toViewState(layers).tabs;

    const restored = new LayerNavigation(tree, saved);
    const state = restored.toViewState(layers.map(layer => ({ ...layer, available: false })));

    expect(state.tabs.every(node => !node.available)).toBe(true);
    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'moisture',
      selectedLayer: 'moisture',
    });
    expect(saved[1].available).toBe(true);
    expect(restored.leadsToSelection('moisture')).toBe(true);
  });

  it('falls back to an available view without changing the remembered child', () => {
    const navigation = new LayerNavigation(tree);
    const onlyMoisture = layers.map(layer => ({
      ...layer,
      available: layer.id === 'moisture',
    }));
    const state = navigation.toViewState(onlyMoisture);

    expect(state.tabs[1]).toMatchObject({
      available: true,
      selectedChild: 'temperature',
      selectedLayer: 'moisture',
    });
    expect(navigation.leadsToSelection('temperature')).toBe(true);
    expect(navigation.leadsToSelection('moisture')).toBe(false);
    expect(navigation.toViewState(layers).tabs[1].selectedLayer).toBe('temperature');
  });

  it('reflects a displayed view without changing the remembered child', () => {
    const navigation = new LayerNavigation(tree);
    const state = navigation.toViewState(layers, 'moisture');

    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'moisture',
      selectedLayer: 'moisture',
    });
    expect(navigation.leadsToSelection('temperature')).toBe(true);
  });
});
