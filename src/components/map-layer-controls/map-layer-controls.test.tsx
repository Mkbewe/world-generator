import { useState } from 'react';
import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MapLayerControls } from './map-layer-controls';
import { PREVIEW_DEFAULTS, usePreviewStore } from '../../stores';
import {
  emptyRenderState,
  layerRegistry,
  type LayerTreeNode,
  type MapLayerOption,
  type MapRendererState,
} from '../../utils/map-renderer';
import { LayerNavigation } from '../preview-map/layer-navigation';

const MULTI_VIEW_TREE: readonly LayerTreeNode[] = [
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

const MULTI_VIEW_LAYERS = ['world-shape', 'temperature', 'moisture', 'noise'].map(id => ({
  id,
  label: id,
  available: true,
}));

interface ControlsProps {
  unavailable?: readonly string[];
  tree?: readonly LayerTreeNode[];
  sourceLayers?: readonly MapLayerOption<string>[];
}

function Controls({
  unavailable = [],
  tree = layerRegistry.tree,
  sourceLayers = emptyRenderState().layers,
}: ControlsProps) {
  const [displayedLayer, setDisplayedLayer] = useState('world-shape');
  const [navigation] = useState(
    () => new LayerNavigation(tree, usePreviewStore.getState().layerTree)
  );
  const layers = sourceLayers.map(layer => ({
    ...layer,
    available: !unavailable.includes(layer.id),
  }));
  const preview: MapRendererState = {
    displayedLayer,
    layers,
    overlays: [],
  };

  return (
    <Theme>
      <MapLayerControls
        preview={preview}
        navigation={navigation.toViewState(layers, displayedLayer)}
        onBaseLayerChange={layer => {
          navigation.select(layer);
          usePreviewStore
            .getState()
            .setBaseLayer(layer, navigation.toViewState(layers, layer).tabs);
          setDisplayedLayer(layer);
        }}
        onOverlayChange={() => {}}
      >
        <div aria-label='Displayed layer'>{displayedLayer}</div>
      </MapLayerControls>
    </Theme>
  );
}

describe('MapLayerControls', () => {
  beforeEach(() => {
    usePreviewStore.setState({ ...PREVIEW_DEFAULTS });
  });

  it('shows macro regions as a leaf tab without a redundant view selector', async () => {
    const user = userEvent.setup();
    render(<Controls />);

    expect(
      within(screen.getByRole('tablist', { name: 'Map layers' }))
        .getAllByRole('tab')
        .map(tab => tab.getAttribute('aria-label'))
    ).toEqual(['World shape', 'Macro regions', 'Noise']);

    await user.click(screen.getByRole('tab', { name: 'Macro regions' }));
    expect(screen.getByLabelText('Displayed layer')).toHaveTextContent('macro-region');
    expect(screen.queryByRole('radiogroup', { name: 'Macro regions view' })).toBeNull();
  });

  it('disables the macro-region tab when its layer is unavailable', () => {
    render(<Controls unavailable={['macro-region']} />);

    expect(screen.getByRole('tab', { name: 'Macro regions' })).toBeDisabled();
  });

  it('supports and remembers multiple definition-driven views in one tab', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Controls tree={MULTI_VIEW_TREE} sourceLayers={MULTI_VIEW_LAYERS} />
    );

    await user.click(screen.getByRole('tab', { name: 'Climate' }));
    expect(screen.getByLabelText('Displayed layer')).toHaveTextContent('temperature');
    await user.click(screen.getByRole('radio', { name: 'Moisture' }));
    expect(screen.getByLabelText('Displayed layer')).toHaveTextContent('moisture');

    await user.click(screen.getByRole('tab', { name: 'Noise' }));
    expect(screen.queryByRole('radiogroup', { name: 'Climate view' })).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Climate' }));
    expect(screen.getByRole('radio', { name: 'Moisture' })).toBeChecked();

    unmount();
    render(<Controls tree={MULTI_VIEW_TREE} sourceLayers={MULTI_VIEW_LAYERS} />);
    await user.click(screen.getByRole('tab', { name: 'Climate' }));
    expect(screen.getByRole('radio', { name: 'Moisture' })).toBeChecked();
  });

  it('selects an available sibling when a grouped view is unavailable', async () => {
    const user = userEvent.setup();
    render(
      <Controls
        tree={MULTI_VIEW_TREE}
        sourceLayers={MULTI_VIEW_LAYERS}
        unavailable={['temperature']}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Climate' }));
    expect(screen.getByLabelText('Displayed layer')).toHaveTextContent('moisture');
    expect(screen.getByRole('radio', { name: 'Temperature' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});
