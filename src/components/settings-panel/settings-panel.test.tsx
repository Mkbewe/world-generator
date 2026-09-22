import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPanel } from './settings-panel';
import { useViewSyncStore, VIEW_SYNC_DEFAULTS } from '../../stores';

interface RenderPanelOptions {
  isGenerating?: boolean;
}

function renderPanel({ isGenerating = false }: RenderPanelOptions = {}) {
  render(
    <Theme>
      <SettingsPanel
        seed='123456'
        onSeedChange={() => {}}
        isGenerating={isGenerating}
        onGenerate={() => {}}
        shape='disc'
        sizeMeters={300}
        metersPerSample={2}
        onShapeChange={() => {}}
        onSizeChange={() => {}}
        onDetailChange={() => {}}
        noise={{ frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 }}
        onNoiseChange={() => {}}
      />
    </Theme>
  );
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
  });

  it('remembers the active tab in the shared sync store', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('tab', { name: 'Noise' }));

    expect(useViewSyncStore.getState().settingsTab).toBe('noise');
  });

  it('renders the general tab with the seed field and the shared generate action', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Map Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'World shape' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Noise' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seed:')).toHaveValue('123456');
    expect(screen.getByTestId('generate-map-button')).toHaveTextContent('Generate Map');
  });

  it('orders the stage tabs by the pipeline order', () => {
    renderPanel();

    const tabs = within(screen.getByRole('tablist', { name: 'Generation settings' }))
      .getAllByRole('tab')
      .map(tab => tab.getAttribute('aria-label'));

    expect(tabs).toEqual(['General', 'World shape', 'Noise', 'Macro regions', 'Landmasses']);
  });

  it('shows the normal label with a loader and disables the action while generating', () => {
    renderPanel({ isGenerating: true });

    const button = screen.getByTestId('generate-map-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Generate Map');
  });
});
