import { useRef } from 'react';

import { Layout } from './components/layout';
import { WorldCanvas, type WorldCanvasRef } from './components/world-canvas';

export function App() {
  const worldCanvasRef = useRef<WorldCanvasRef>(null);

  const handleExportMap = () => {
    worldCanvasRef.current?.exportMap();
  };

  return (
    <Layout onExportMap={handleExportMap}>
      <WorldCanvas ref={worldCanvasRef} />
    </Layout>
  );
}
