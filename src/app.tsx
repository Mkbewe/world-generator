import { RouterProvider } from 'react-router/dom';

import { FeatureFlagsProvider } from './feature-flags';
import { router } from './router';
import { ThemeProvider } from './theme';

export function App() {
  return (
    <FeatureFlagsProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </FeatureFlagsProvider>
  );
}
