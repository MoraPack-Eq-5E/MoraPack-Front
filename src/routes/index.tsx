/**
 * Login Route
 * Ruta de inicio de sesión
 */

import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/pages';

export const Route = createFileRoute('/')({
  component: LoginPage,
});

