import { useMemo } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { SessionManager } from './providers/SessionManager';
import { routes } from './router';

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), []);
  return (
    <>
      <SessionManager />
      <RouterProvider router={router} />
    </>
  );
}
