import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { SettingsPanel } from './settings-panel';

interface RenderPanelOptions {
  isGenerating?: boolean;
}

function renderPanel({ isGenerating = false }: RenderPanelOptions = {}) {
  render(
    <Theme>
      <SettingsPanel
        seed='12345'
        onSeedChange={() => {}}
        useWorker
        onUseWorkerChange={() => {}}
        isGenerating={isGenerating}
        onGenerate={() => {}}
      />
    </Theme>
  );
}

describe('SettingsPanel', () => {
  it('renders the basic tab with the seed field and the shared generate action', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Map Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Basic' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seed:')).toHaveValue('12345');
    expect(screen.getByTestId('generate-map-button')).toHaveTextContent('Generate Map');
  });

  it('disables the generate action while generating', () => {
    renderPanel({ isGenerating: true });

    expect(screen.getByTestId('generate-map-button')).toBeDisabled();
    expect(screen.getByTestId('generate-map-button')).toHaveTextContent('Generating...');
  });
});
