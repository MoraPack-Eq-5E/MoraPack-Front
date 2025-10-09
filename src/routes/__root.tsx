/**
 * Root Route
 * Ruta raíz de la aplicación
 */

import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});

