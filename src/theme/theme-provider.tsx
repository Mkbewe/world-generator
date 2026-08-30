import { createContext, type ReactNode, useContext, useState } from 'react';
import { Theme } from '@radix-ui/themes';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  appearance: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<ThemeMode>('dark');

  const toggleTheme = (): void => {
    setAppearance(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ appearance, toggleTheme }}>
      <Theme
        appearance={appearance}
        accentColor='violet'
        grayColor='gray'
        radius='large'
        scaling='100%'
        panelBackground='solid'
      >
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
