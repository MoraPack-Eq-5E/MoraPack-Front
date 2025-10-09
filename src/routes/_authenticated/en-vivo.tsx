/**
 * En Vivo Route
 * Ruta del mapa en modo "en vivo" dentro del layout autenticado
 */

import { createFileRoute } from '@tanstack/react-router';
import { EnVivoPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/en-vivo')({
  component: EnVivoPage,
});
