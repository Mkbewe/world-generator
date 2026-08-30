import { createMemoryRouter, RouterProvider } from 'react-router';
import { render, screen } from '@testing-library/react';

import { FeatureFlagsContext, FLAG_DEFAULTS } from './feature-flags';
import { routes } from './router';
import { ThemeProvider } from './theme';

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <FeatureFlagsContext.Provider value={FLAG_DEFAULTS}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </FeatureFlagsContext.Provider>
  );
}

describe('router', () => {
  it('renders the legacy generator on /legacy-generator', () => {
    renderRoute('/legacy-generator');

    expect(screen.getByRole('heading', { name: 'World Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'World Preview' })).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', () => {
    renderRoute('/uncharted-waters');

    expect(
      screen.getByRole('heading', { name: "This island hasn't been generated yet" })
    ).toBeInTheDocument();
  });

  it('renders the 500 page when a route throws', () => {
    renderRoute('/__crash');

    expect(
      screen.getByRole('heading', { name: 'The world generator ran aground' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument();
  });

  it('renders the 404 page outside of the main layout', () => {
    renderRoute('/uncharted-waters');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
  });
});
