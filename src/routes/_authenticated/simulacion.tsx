/**
 * Simulación Route
 * Ruta del mapa en modo "simulación" dentro del layout autenticado
 */

import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/simulacion')({
  component: lazyRouteComponent(() => import('@/pages/SimulacionPage')),
});
