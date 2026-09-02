import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';
import { HeaderActionsContext } from './header-actions-context';
import { FeatureFlagsContext } from '../../feature-flags';

function renderHeader(options?: { isMapGenerated?: boolean; onOpenDialog?: () => void }) {
  const { isMapGenerated = true, onOpenDialog = vi.fn() } = options || {};

  return render(
    <MemoryRouter>
      <FeatureFlagsContext.Provider value={{ exportPng: true, pipelinePreview: false }}>
        <HeaderActionsContext.Provider
          value={{
            exportMapRef: { current: undefined },
            isExportDialogOpen: false,
            setIsExportDialogOpen: onOpenDialog,
            confirmExport: vi.fn(),
            isMapGenerated,
            setIsMapGenerated: vi.fn(),
          }}
        >
          <Header />
        </HeaderActionsContext.Provider>
      </FeatureFlagsContext.Provider>
    </MemoryRouter>
  );
}

describe('Header', () => {
  it('should render successfully', () => {
    const { container } = renderHeader();
    expect(container).toBeTruthy();
  });

  it('should display logo and title', () => {
    renderHeader();

    const title = screen.getByText('World Generator');
    expect(title).toBeInTheDocument();
  });

  it('should render the export button', () => {
    renderHeader();

    const exportButton = screen.getByRole('button', { name: /export png/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('should render links to the legacy generator and statistics pages', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'href',
      '/legacy-generator'
    );
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/statistics');
  });

  it('should call the export handler when the export button is clicked', async () => {
    const user = userEvent.setup();
    const mockOpenDialog = vi.fn();
    renderHeader({ onOpenDialog: mockOpenDialog });

    const exportButton = screen.getByRole('button', { name: /export png/i });
    await user.click(exportButton);

    expect(mockOpenDialog).toHaveBeenCalledTimes(1);
    expect(mockOpenDialog).toHaveBeenCalledWith(true);
  });
});
