import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';

import { Breadcrumbs } from './breadcrumbs';

function renderBreadcrumbs(items?: { label: string; to?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumbs items={items} />
    </MemoryRouter>
  );
}

describe('Breadcrumbs', () => {
  it('should render breadcrumbs from provided items', () => {
    renderBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Legacy Generator' }]);

    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Legacy Generator')).toBeInTheDocument();
  });

  it('should render links for items with to property', () => {
    renderBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Legacy Generator' }]);

    const homeLink = screen.getByText('Home');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render last item as active span without link', () => {
    renderBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Legacy Generator' }]);

    const activeItem = screen.getByText('Legacy Generator');
    expect(activeItem.tagName).toBe('SPAN');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('should render separators between items', () => {
    renderBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Legacy Generator' }]);

    const nav = screen.getByLabelText('Breadcrumb');
    const separators = nav.querySelectorAll('svg');
    expect(separators.length).toBe(2);
  });

  it('should render a single item without separator', () => {
    renderBreadcrumbs([{ label: 'Home' }]);

    const nav = screen.getByLabelText('Breadcrumb');
    const separators = nav.querySelectorAll('svg');
    expect(separators.length).toBe(1);
  });
});
