import { createRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CursorReadout } from './cursor-readout';
import { MapSidebar } from './map-sidebar';
import { emptyRenderState, type MapLayerNavigation } from '../../../../utils/map-renderer';

const PREVIEW = emptyRenderState();
const NAVIGATION: MapLayerNavigation = { tabs: [], activeTab: undefined };
const GROUP_NAVIGATION: MapLayerNavigation = {
  tabs: [
    {
      id: 'base-climate',
      labelKey: 'layers.baseClimate',
      available: true,
      selectedChild: 'heat-zones',
      selectedLayer: 'heat-zones',
      children: [
        {
          id: 'heat-zones',
          labelKey: 'layers.heatZones',
          available: true,
          selectedLayer: 'heat-zones',
        },
        {
          id: 'moisture',
          labelKey: 'layers.moisture',
          available: true,
          selectedLayer: 'moisture',
        },
      ],
    },
  ],
  activeTab: 'world-shape',
};
const VIEW = {
  zoom: 1,
  fitted: true,
  onZoomIn: () => {},
  onZoomOut: () => {},
  onReset: () => {},
};
const TOOL_BAR = {
  measuring: false,
  onToggleMeasuring: () => {},
  pinning: true,
  onTogglePinning: () => {},
};
const INSPECTOR = <CursorReadout items={[]} />;

function renderSidebar(
  mode: 'inline' | 'fullscreen',
  navigation: MapLayerNavigation = NAVIGATION
): HTMLElement {
  const fullscreen = {
    active: mode === 'fullscreen',
    triggerRef: createRef<HTMLButtonElement>(),
    onToggle: () => {},
  };
  const { container } = render(
    <Theme>
      {mode === 'fullscreen' ? (
        <MapSidebar
          mode='fullscreen'
          preview={PREVIEW}
          navigation={navigation}
          onLayerChange={() => {}}
          onOverlayChange={() => {}}
          fullscreen={fullscreen}
          view={VIEW}
          toolBar={TOOL_BAR}
          inspector={INSPECTOR}
        />
      ) : (
        <MapSidebar
          mode='inline'
          preview={PREVIEW}
          navigation={navigation}
          onLayerChange={() => {}}
          onOverlayChange={() => {}}
          fullscreen={fullscreen}
          inspector={INSPECTOR}
        />
      )}
    </Theme>
  );
  return container;
}

describe('MapSidebar', () => {
  it('renders the sections without the floating chrome outside fullscreen', () => {
    const container = renderSidebar('inline');

    expect(container.querySelector('[data-position]')).toBeNull();
    expect(screen.queryByText('Panels')).toBeNull();
    expect(screen.queryByText('View')).toBeNull();
    expect(screen.queryByText('Tools')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Enter fullscreen' });
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
    expect(trigger.compareDocumentPosition(screen.getByText('Overlays'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('floats the sections with the panel header in fullscreen', () => {
    const container = renderSidebar('fullscreen');

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-position', 'top');
    const positions = screen.getByRole('radiogroup', { name: 'Panel position' });
    expect(
      within(positions)
        .getAllByRole('radio')
        .map(radio => radio.getAttribute('aria-label'))
    ).toEqual(['Move panels to top', 'Move panels to bottom']);
    const trigger = screen.getByRole('button', { name: 'Exit fullscreen' });
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    expect(trigger.compareDocumentPosition(screen.getByText('Overlays'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByText('Panels')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    const scroll = container.querySelector('[data-panel-scroll]');
    expect(scroll).not.toBeNull();
    if (!scroll) {
      throw new Error('Expected the panel scroll area.');
    }
    expect(scroll).toContainElement(screen.getByText('View'));
    expect(scroll).not.toContainElement(screen.getByRole('button', { name: 'Exit fullscreen' }));
  });

  it('shows the layer-view divider only with the active layer-view group', () => {
    const withoutViews = renderSidebar('fullscreen', GROUP_NAVIGATION);
    expect(withoutViews.querySelector('[data-layer-views-separator]')).toBeNull();

    cleanup();

    const withViews = renderSidebar('fullscreen', {
      ...GROUP_NAVIGATION,
      activeTab: 'base-climate',
    });
    expect(withViews.querySelector('[data-layer-views-separator]')).not.toBeNull();
  });

  it('moves the floating panel between the top and the bottom', async () => {
    const user = userEvent.setup();
    const container = renderSidebar('fullscreen');

    await user.click(screen.getByRole('radio', { name: 'Move panels to bottom' }));
    expect(container.querySelector('[data-position]')).toHaveAttribute('data-position', 'bottom');

    await user.click(screen.getByRole('radio', { name: 'Move panels to top' }));
    expect(container.querySelector('[data-position]')).toHaveAttribute('data-position', 'top');
  });

  it('collapses the floating panels to the toggle button and expands back', async () => {
    const user = userEvent.setup();
    const container = renderSidebar('fullscreen');

    await user.click(screen.getByRole('button', { name: 'Hide panels' }));

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-collapsed');
    expect(screen.queryByText('Panels')).toBeNull();
    expect(container.querySelector('[data-panel-scroll]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Exit fullscreen' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show panels' }));

    expect(container.querySelector('[data-position]')).not.toHaveAttribute('data-collapsed');
    expect(screen.getByText('Panels')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();
  });
});
