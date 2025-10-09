/**
 * Dashboard Route
 * Ruta del dashboard principal dentro del layout autenticado
 */

import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});
