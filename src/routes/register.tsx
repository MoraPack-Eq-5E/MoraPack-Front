/**
 * Register Route
 * Ruta pública de registro (/register)
 * 
 * Permite a nuevos usuarios crear una cuenta en la plataforma.
 */

import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/pages';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});