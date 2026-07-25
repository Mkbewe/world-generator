import { useRef, useState } from 'react';
import { Theme } from '@radix-ui/themes';

import { Layout } from './components/layout';
import { WorldCanvas, type WorldCanvasRef } from './components/world-canvas';

export function App() {
  const worldCanvasRef = useRef<WorldCanvasRef>(null);
  const [appearance, setAppearance] = useState<'light' | 'dark'>('dark');

  const handleExportMap = () => {
    worldCanvasRef.current?.exportMap();
  };

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
      <Layout onExportMap={handleExportMap} onToggleTheme={toggleTheme} currentTheme={appearance}>
        <WorldCanvas ref={worldCanvasRef} />
      </Layout>
    </Theme>
  );
}
