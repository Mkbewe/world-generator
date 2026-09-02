import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { LegacyGeneratorPage } from './legacy-generator-page';
import { HeaderActionsProvider } from '../../components/header';

describe('LegacyGeneratorPage', () => {
  it('renders the legacy world generator', () => {
    render(
      <Theme>
        <HeaderActionsProvider>
          <LegacyGeneratorPage />
        </HeaderActionsProvider>
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'World Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'World Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled();
  });
});
