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
});
