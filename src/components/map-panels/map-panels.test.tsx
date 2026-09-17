import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MapPanels } from './map-panels';
import { emptyRenderState } from '../../utils/map-renderer';

function renderPanels(expanded: boolean): HTMLElement {
  const { container } = render(
    <Theme>
      <MapPanels
        preview={emptyRenderState()}
        navigation={{ tabs: [], activeTab: undefined }}
        onBaseLayerChange={() => {}}
        onOverlayChange={() => {}}
        expanded={expanded}
      />
    </Theme>
  );
  return container;
}

describe('MapPanels', () => {
  it('renders the sections without the floating chrome outside fullscreen', () => {
    const container = renderPanels(false);

    expect(container.querySelector('[data-position]')).toBeNull();
    expect(screen.queryByText('Panels')).toBeNull();
  });

  it('floats the sections with the panel header in fullscreen', () => {
    const container = renderPanels(true);

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-position', 'middle');
    expect(screen.getByText('Panels')).toBeInTheDocument();
  });

  it('collapses the floating panels to the toggle button and expands back', async () => {
    const user = userEvent.setup();
    const container = renderPanels(true);

    await user.click(screen.getByRole('button', { name: 'Hide panels' }));

    expect(container.querySelector('[data-position]')).toHaveAttribute('data-collapsed');
    expect(screen.queryByText('Panels')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show panels' }));

    expect(container.querySelector('[data-position]')).not.toHaveAttribute('data-collapsed');
    expect(screen.getByText('Panels')).toBeInTheDocument();
  });
});
