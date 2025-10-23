/**
 * RegisterPage
 * Página de registro de nuevos usuarios
 * 
 * Permite a los usuarios crear una nueva cuenta proporcionando:
 * - Nombre completo
 * - Correo electrónico
 * - Número de teléfono
 * - Contraseña (con validaciones de seguridad)
 * 
 * Después del registro exitoso, el usuario es automáticamente
 * autenticado y redirigido al dashboard.
 */

import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import loginImage from '@/assets/images/login-image.jpg';

export function RegisterPage() {
  const navigate = useNavigate();

  const handleRegisterSuccess = () => {
    navigate({ to: '/dashboard' });
  };

  const handleLoginClick = () => {
    navigate({ to: '/' });
  };

  return (
    <AuthLayout imageUrl={loginImage} imageAlt="MoraPack - Servicio de envíos">
      <RegisterForm onSuccess={handleRegisterSuccess} onLoginClick={handleLoginClick} />
    </AuthLayout>
  );
}