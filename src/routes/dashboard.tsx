/**
 * Dashboard Route
 * Ruta del dashboard principal
 */

import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/pages';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

