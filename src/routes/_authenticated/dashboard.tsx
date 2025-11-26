/**
 * Dashboard Route
 * Ruta del dashboard principal dentro del layout autenticado
 * Con lazy loading para optimizar el bundle inicial
 */

import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: lazyRouteComponent(() => import('@/pages/DashboardPage')),
});
