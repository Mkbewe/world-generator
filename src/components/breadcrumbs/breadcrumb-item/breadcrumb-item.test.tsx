import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';

import { BreadcrumbItem } from './breadcrumb-item';

function renderItem(props: { label: string; to?: string; isLast?: boolean }) {
  render(
    <MemoryRouter>
      <BreadcrumbItem {...props} />
    </MemoryRouter>
  );
}

describe('BreadcrumbItem', () => {
  it('links a crumb that is not the current page', () => {
    renderItem({ label: 'Home', to: '/' });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('renders the last crumb as the current page', () => {
    renderItem({ label: 'Statistics', to: '/statistics', isLast: true });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Statistics')).toHaveAttribute('aria-current', 'page');
  });

  it('renders a crumb without a target as plain text', () => {
    renderItem({ label: 'Legacy generator' });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy generator')).not.toHaveAttribute('aria-current');
  });
});
