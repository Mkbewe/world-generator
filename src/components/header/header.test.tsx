import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';

import { Header } from './header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
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

  it('should render links to the legacy generator and statistics pages', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'href',
      '/legacy-generator'
    );
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/statistics');
  });
});
