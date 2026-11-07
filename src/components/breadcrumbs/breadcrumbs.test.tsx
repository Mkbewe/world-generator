import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';

import { Breadcrumbs, type BreadcrumbsItem } from './breadcrumbs';

function renderBreadcrumbs(items?: BreadcrumbsItem[]) {
  return render(
    <MemoryRouter>
      <Breadcrumbs items={items} />
    </MemoryRouter>
  );
}

describe('Breadcrumbs', () => {
  it('should render breadcrumbs from provided items', () => {
    renderBreadcrumbs([
      { labelKey: 'navigation.home', to: '/' },
      { labelKey: 'navigation.legacy' },
    ]);

    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Legacy Generator')).toBeInTheDocument();
  });

  it('should render links for items with to property', () => {
    renderBreadcrumbs([
      { labelKey: 'navigation.home', to: '/' },
      { labelKey: 'navigation.legacy' },
    ]);

    const homeLink = screen.getByText('Home');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should render last item as active span without link', () => {
    renderBreadcrumbs([
      { labelKey: 'navigation.home', to: '/' },
      { labelKey: 'navigation.legacy' },
    ]);

    const activeItem = screen.getByText('Legacy Generator');
    expect(activeItem.tagName).toBe('SPAN');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('should render separators between items', () => {
    renderBreadcrumbs([
      { labelKey: 'navigation.home', to: '/' },
      { labelKey: 'navigation.legacy' },
    ]);

    const nav = screen.getByLabelText('Breadcrumb');
    const separators = nav.querySelectorAll('svg');
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render a single item without separator', () => {
    renderBreadcrumbs([{ labelKey: 'navigation.home' }]);

    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav.querySelectorAll('svg')).toHaveLength(0);
  });
});
