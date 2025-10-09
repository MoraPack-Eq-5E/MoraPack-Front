/**
 * Map Route
 * Ruta del mapa en vivo
 */

import { createFileRoute } from '@tanstack/react-router';
import { MapPage } from '@/pages';

export const Route = createFileRoute('/map')({
    component: MapPage,
});
