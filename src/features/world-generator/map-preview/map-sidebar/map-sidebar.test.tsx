import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MapSidebar } from './map-sidebar';
import { emptyRenderState } from '../../../../utils/map-renderer';

const PREVIEW = emptyRenderState();
const NAVIGATION = { tabs: [], activeTab: undefined };
const VIEW = {
  zoom: 1,
  fitted: true,
  onZoomIn: () => {},
  onZoomOut: () => {},
  onReset: () => {},
};
const MEASURE = { measuring: false, onToggleMeasuring: () => {} };
const INSPECTOR = { items: [] };

function renderSidebar(mode: 'inline' | 'fullscreen'): HTMLElement {
  const { container } = render(
    <Theme>
      {mode === 'fullscreen' ? (
        <MapSidebar
          mode='fullscreen'
          preview={PREVIEW}
          navigation={NAVIGATION}
          onLayerChange={() => {}}
          onOverlayChange={() => {}}
          view={VIEW}
          measure={MEASURE}
          inspector={INSPECTOR}
        />
      ) : (
        <MapSidebar
          mode='inline'
          preview={PREVIEW}
          navigation={NAVIGATION}
          onLayerChange={() => {}}
          onOverlayChange={() => {}}
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
    expect(screen.queryByText('Controls')).toBeNull();
  });

  it('floats the sections with the panel header in fullscreen', () => {
    const container = renderSidebar('fullscreen');

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-position', 'middle');
    expect(screen.getByText('Panels')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });

  it('collapses the floating panels to the toggle button and expands back', async () => {
    const user = userEvent.setup();
    const container = renderSidebar('fullscreen');

    await user.click(screen.getByRole('button', { name: 'Hide panels' }));

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-collapsed');
    expect(screen.queryByText('Panels')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show panels' }));

    expect(container.querySelector('[data-position]')).not.toHaveAttribute('data-collapsed');
    expect(screen.getByText('Panels')).toBeInTheDocument();
  });
});
