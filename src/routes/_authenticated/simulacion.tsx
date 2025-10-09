/**
 * Simulación Route
 * Ruta del mapa en modo "simulación" dentro del layout autenticado
 */

import { createFileRoute } from '@tanstack/react-router';
import { SimulacionPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/simulacion')({
  component: SimulacionPage,
});
