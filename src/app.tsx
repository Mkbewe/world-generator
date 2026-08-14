import { useState } from 'react';
import { Theme } from '@radix-ui/themes';

import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home';
import { FeatureFlagsProvider } from './feature-flags';

export function App() {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('dark');

  const toggleTheme = () => {
    setAppearance(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <FeatureFlagsProvider>
      <Theme
        appearance={appearance}
        accentColor='violet'
        grayColor='gray'
        radius='large'
        scaling='95%'
        panelBackground='solid'
      >
        <MainLayout onToggleTheme={toggleTheme} currentTheme={appearance}>
          <HomePage />
        </MainLayout>
      </Theme>
    </FeatureFlagsProvider>
  );
}
