/**
 * Airports Route
 * Ruta de la página de aeropuertos dentro del layout autenticado
 */

import { createFileRoute } from '@tanstack/react-router';
import { AirportsPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/aeropuertos')({
  component: AirportsPage,
});
