import { createBrowserRouter, type RouteObject } from 'react-router';

import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home';
import { LegacyGeneratorPage } from './pages/legacy-generator';

export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'legacy-generator', element: <LegacyGeneratorPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
