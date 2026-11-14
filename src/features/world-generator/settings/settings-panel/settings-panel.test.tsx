import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPanel } from './settings-panel';
import {
  GENERAL_FORM_DEFAULTS,
  useGeneralFormStore,
  useViewSyncStore,
  useWorldShapeFormStore,
  VIEW_SYNC_DEFAULTS,
  WORLD_SHAPE_FORM_DEFAULTS,
} from '../../../../stores';

interface RenderPanelOptions {
  isGenerating?: boolean;
}

function renderPanel({ isGenerating = false }: RenderPanelOptions = {}) {
  render(
    <Theme>
      <SettingsPanel isGenerating={isGenerating} onGenerate={() => {}} />
    </Theme>
  );
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
    useGeneralFormStore.setState({ ...GENERAL_FORM_DEFAULTS });
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
  });

  it('remembers the active tab in the shared sync store', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('tab', { name: 'Geology' }));

    expect(useViewSyncStore.getState().settingsTab).toBe('geology');
  });

  it('renders the general tab with the seed field and the shared generate action', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Map Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'World shape' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Macro regions' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seed:')).toHaveValue('123456');
    expect(screen.getByTestId('generate-map-button')).toHaveTextContent('Generate Map');
  });

  it('orders the form tabs by the layer catalog order', () => {
    renderPanel();

    const tabs = within(screen.getByRole('tablist', { name: 'Generation settings' }))
      .getAllByRole('tab')
      .map(tab => tab.getAttribute('aria-label'));

    expect(tabs).toEqual([
      'General',
      'World shape',
      'Macro regions',
      'Base Climate',
      'Geology',
      'Heightmap',
    ]);
  });

  it('shows the normal label with a loader and disables the action while generating', () => {
    renderPanel({ isGenerating: true });

    const button = screen.getByTestId('generate-map-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Generate Map');
  });
});
