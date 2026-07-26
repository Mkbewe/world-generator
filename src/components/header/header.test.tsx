import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Header } from './header';

describe('Header', () => {
  it('should render successfully', () => {
    const { container } = render(<Header />);
    expect(container).toBeTruthy();
  });

  it('should display logo and title', () => {
    render(<Header />);

    const title = screen.getByText('World Generator');
    expect(title).toBeInTheDocument();
  });

  it('should not render export button when onExportMap is not provided', () => {
    render(<Header />);

    const exportButton = screen.queryByRole('button', { name: /export png/i });
    expect(exportButton).not.toBeInTheDocument();
  });

  it('should render export button when onExportMap is provided', () => {
    const mockExport = vi.fn();
    render(<Header onExportMap={mockExport} />);

    const exportButton = screen.getByRole('button', { name: /export png/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('should call onExportMap when export button is clicked', async () => {
    const user = userEvent.setup();
    const mockExport = vi.fn();
    render(<Header onExportMap={mockExport} />);

    const exportButton = screen.getByRole('button', { name: /export png/i });
    await user.click(exportButton);

    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it('should have export button with correct text', () => {
    const mockExport = vi.fn();
    render(<Header onExportMap={mockExport} />);

    const exportButton = screen.getByRole('button', { name: /export png/i });
    expect(exportButton).toBeInTheDocument();
  });
});
