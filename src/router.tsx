import { createBrowserRouter, type RouteObject } from 'react-router';

import type { RouteHandle } from './components/breadcrumbs';
import { MainLayout } from './layouts/main-layout';
import { HomePage } from './pages/home';
import { LegacyGeneratorPage } from './pages/legacy-generator';

export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    handle: { breadcrumb: 'Home' } satisfies RouteHandle,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'legacy-generator',
        element: <LegacyGeneratorPage />,
        handle: { breadcrumb: 'Legacy Generator' } satisfies RouteHandle,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
