import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { Navigation } from './navigation';

function renderNavigation(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Theme>
        <Navigation />
      </Theme>
    </MemoryRouter>
  );
}

describe('Navigation', () => {
  it('renders links to home, legacy generator and statistics', () => {
    renderNavigation();

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'href',
      '/legacy-generator'
    );
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/statistics');
  });

  it('marks the home link as active on the home page', () => {
    renderNavigation('/');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Legacy Generator' })).not.toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('marks the legacy generator link as active on the legacy generator page', () => {
    renderNavigation('/legacy-generator');

    expect(screen.getByRole('link', { name: 'Legacy Generator' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('marks the statistics link as active on the statistics page', () => {
    renderNavigation('/statistics');

    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
