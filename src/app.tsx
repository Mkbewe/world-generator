import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router/dom';

import { FeatureFlagsProvider } from './feature-flags';
import { i18n } from './i18n';
import { router } from './router';
import { ThemeProvider } from './theme';

export function App() {
  return (
    <FeatureFlagsProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </I18nextProvider>
    </FeatureFlagsProvider>
  );
}
