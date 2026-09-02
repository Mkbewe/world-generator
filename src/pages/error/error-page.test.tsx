import { createMemoryRouter, RouterProvider } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { ErrorPage } from './error-page';

function ThrowingComponent(): never {
  throw new Error('Test eruption');
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/', element: <ThrowingComponent />, errorElement: <ErrorPage /> }],
    { initialEntries: ['/'] }
  );

  return render(
    <Theme>
      <RouterProvider router={router} />
    </Theme>
  );
}

describe('ErrorPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the 500 message and the route error details', () => {
    renderPage();

    expect(screen.getByText('Error 500')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'The world generator ran aground' })
    ).toBeInTheDocument();
    expect(screen.getByText('Test eruption')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
