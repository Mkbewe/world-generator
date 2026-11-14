import { createRef } from 'react';
import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CursorReadout } from './cursor-readout';
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
const INSPECTOR = <CursorReadout items={[]} />;

function renderSidebar(mode: 'inline' | 'fullscreen'): HTMLElement {
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
          navigation={NAVIGATION}
          onLayerChange={() => {}}
          onOverlayChange={() => {}}
          fullscreen={fullscreen}
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
    expect(screen.queryByText('Controls')).toBeNull();
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
    expect(screen.getByText('Controls')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Show panels' }));

    expect(container.querySelector('[data-position]')).not.toHaveAttribute('data-collapsed');
    expect(screen.getByText('Panels')).toBeInTheDocument();
  });
});
