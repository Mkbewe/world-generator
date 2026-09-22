import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import '@radix-ui/themes/styles.css';
import './theme/index.scss';
import './index.scss';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('The application root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
