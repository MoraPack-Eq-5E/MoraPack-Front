/**
 * En Vivo Route
 * Ruta del mapa en modo "en vivo" dentro del layout autenticado
 * Con lazy loading para optimizar el bundle inicial
 */

import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/en-vivo')({
  component: lazyRouteComponent(() => import('@/pages/EnVivoPage')),
});
