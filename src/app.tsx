import { useState } from 'react';
import { Theme } from '@radix-ui/themes';

import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home';

export function App() {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('dark');

  const toggleTheme = () => {
    setAppearance(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Theme
      appearance={appearance}
      accentColor='violet'
      grayColor='gray'
      radius='large'
      scaling='95%'
    >
      <MainLayout onToggleTheme={toggleTheme} currentTheme={appearance}>
        <HomePage />
      </MainLayout>
    </Theme>
  );
}
