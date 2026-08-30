import { createMemoryRouter, RouterProvider } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { NotFoundPage } from './not-found-page';

function renderPage() {
  const router = createMemoryRouter([{ path: '*', element: <NotFoundPage /> }], {
    initialEntries: ['/uncharted-waters'],
  });

  return render(
    <Theme>
      <RouterProvider router={router} />
    </Theme>
  );
}

describe('NotFoundPage', () => {
  it('renders the 404 message with navigation links', () => {
    renderPage();

    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "This island hasn't been generated yet" })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
