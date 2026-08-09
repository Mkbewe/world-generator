import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';
import { HeaderActionsContext } from './header-actions-context';
import { FeatureFlagsContext } from '../../feature-flags';

function renderHeader(exportMap?: () => void) {
  return render(
    <FeatureFlagsContext.Provider value={{ exportPng: true }}>
      <HeaderActionsContext.Provider value={{ exportMapRef: { current: exportMap } }}>
        <Header />
      </HeaderActionsContext.Provider>
    </FeatureFlagsContext.Provider>
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

  it('should call the export handler when the export button is clicked', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    renderHeader(mockExport);

    const exportButton = screen.getByRole('button', { name: /export png/i });
    await user.click(exportButton);

    expect(mockExport).toHaveBeenCalledTimes(1);
  });
});
