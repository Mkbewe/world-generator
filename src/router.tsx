import { createBrowserRouter, type RouteObject } from 'react-router';

import type { RouteHandle } from './components/breadcrumbs';
import { MainLayout } from './layouts/main-layout';
import { ErrorPage } from './pages/error';
import { HomePage } from './pages/home';
import { LegacyGeneratorPage } from './pages/legacy-generator';
import { NotFoundPage } from './pages/not-found';

function CrashTestTrigger(): never {
  throw new Error('Intentional crash to preview the 500 error page.');
}

export const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    handle: { breadcrumb: 'Home' } satisfies RouteHandle,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'legacy-generator',
        element: <LegacyGeneratorPage />,
        handle: { breadcrumb: 'Legacy Generator' } satisfies RouteHandle,
      },
      // Dev-only: visit /__crash to preview the 500 error page.
      ...(import.meta.env.DEV
        ? ([{ path: '__crash', element: <CrashTestTrigger /> }] satisfies RouteObject[])
        : []),
    ],
  },
  // Rendered outside MainLayout so the error takes over the whole page.
  { path: '*', element: <NotFoundPage />, errorElement: <ErrorPage /> },
];

export const router = createBrowserRouter(routes);
