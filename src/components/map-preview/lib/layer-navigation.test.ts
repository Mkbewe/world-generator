import { LayerNavigation } from './layer-navigation';
import {
  layerRegistry,
  type LayerTreeNode,
  type MapBaseLayerId,
  type MapLayerOption,
} from '../../../utils/map-renderer';

const tree: readonly LayerTreeNode[] = [
  { id: 'world-shape', labelKey: 'layers.worldShape' },
  {
    id: 'climate',
    labelKey: 'layers.baseClimate',
    children: [
      { id: 'macro-region', labelKey: 'layers.macroRegions' },
      { id: 'geology', labelKey: 'layers.geology' },
    ],
  },
];

const layerIds = ['world-shape', 'macro-region', 'geology'] as const;
const layers: readonly MapLayerOption<MapBaseLayerId>[] = layerIds.map(id => ({
  id,
  labelKey: 'layers.geology',
  available: true,
}));

describe('LayerNavigation', () => {
  it('rejects an empty group instead of creating an invalid fallback', () => {
    expect(
      () => new LayerNavigation([{ id: 'empty', labelKey: 'layers.geology', children: [] }])
    ).toThrow('must contain at least one layer');
  });

  it('selects the first child of a group by default', () => {
    const navigation = new LayerNavigation(tree);

    expect(
      layers.filter(layer => navigation.leadsToSelection(layer.id)).map(layer => layer.id)
    ).toEqual(['world-shape', 'macro-region']);
  });

  it('uses the remembered child from the saved tree', () => {
    const navigation = new LayerNavigation(tree);
    const saved = navigation.toViewState(layers, 'geology').tabs;

    const state = navigation.toViewState(layers, 'geology', saved);
    expect(state.activeTab).toBe('climate');
    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'geology',
      selectedLayer: 'geology',
    });
    expect(
      layers.filter(layer => navigation.leadsToSelection(layer.id, saved)).map(layer => layer.id)
    ).toEqual(['world-shape', 'geology']);

    expect(navigation.toViewState(layers, 'world-shape', saved).tabs[1].selectedLayer).toBe(
      'geology'
    );
  });

  it('restores remembered selections from saved view state', () => {
    const navigation = new LayerNavigation(tree);
    const saved = navigation.toViewState(layers, 'geology').tabs;
    const unavailable = layers.map(layer => ({ ...layer, available: false }));

    const state = navigation.toViewState(unavailable, undefined, saved);

    expect(state.tabs.every(node => !node.available)).toBe(true);
    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'geology',
      selectedLayer: 'geology',
    });
    expect(saved[1].available).toBe(true);
    expect(navigation.leadsToSelection('geology', saved)).toBe(true);
  });

  it('follows an externally updated saved tree without mutating it', () => {
    const navigation = new LayerNavigation(tree);
    expect(navigation.leadsToSelection('geology')).toBe(false);

    const saved = navigation.toViewState(layers, 'geology').tabs;
    const snapshot = structuredClone(saved);

    expect(navigation.leadsToSelection('geology', saved)).toBe(true);
    expect(navigation.leadsToSelection('macro-region', saved)).toBe(false);
    expect(navigation.toViewState(layers, undefined, saved).tabs[1].selectedChild).toBe('geology');
    expect(saved).toEqual(snapshot);
  });

  it('falls back to an available view without changing the remembered child', () => {
    const navigation = new LayerNavigation(tree);
    const onlyGeology = layers.map(layer => ({
      ...layer,
      available: layer.id === 'geology',
    }));
    const state = navigation.toViewState(onlyGeology);

    expect(state.tabs[1]).toMatchObject({
      available: true,
      selectedChild: 'macro-region',
      selectedLayer: 'geology',
    });
    expect(navigation.leadsToSelection('macro-region')).toBe(true);
    expect(navigation.leadsToSelection('geology')).toBe(false);
    expect(navigation.toViewState(layers).tabs[1].selectedLayer).toBe('macro-region');
  });

  it('keeps the real BaseClimate layers in one switchable group', () => {
    const navigation = new LayerNavigation(layerRegistry.tree);
    const available = layerRegistry.order.map((id): MapLayerOption<MapBaseLayerId> => ({
      id,
      labelKey: 'layers.geology',
      available: id === 'heat-zones' || id === 'moisture' || id === 'ocean-currents',
    }));

    const state = navigation.toViewState(available, 'moisture');

    expect(state.activeTab).toBe('base-climate');
    expect(state.tabs.find(tab => tab.id === 'base-climate')).toMatchObject({
      selectedChild: 'moisture',
      selectedLayer: 'moisture',
      children: [
        { id: 'heat-zones', available: true },
        { id: 'moisture', available: true },
        { id: 'ocean-currents', available: true },
      ],
    });
  });

  it('reflects a displayed view without changing the remembered child', () => {
    const navigation = new LayerNavigation(tree);
    const state = navigation.toViewState(layers, 'geology');

    expect(state.tabs[1]).toMatchObject({
      selectedChild: 'geology',
      selectedLayer: 'geology',
    });
    expect(navigation.leadsToSelection('macro-region')).toBe(true);
  });
});
