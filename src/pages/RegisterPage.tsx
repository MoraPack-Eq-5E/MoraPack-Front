/**
 * RegisterPage
 * Página de registro de usuario
 */

import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import loginImage from '@/assets/images/login-image.jpg';

export function RegisterPage() {
  const navigate = useNavigate();

  const handleRegisterSuccess = () => {
    // Navegar al dashboard después del registro exitoso
    navigate({ to: '/dashboard' });
  };

  const handleLoginClick = () => {
    // Navegar a login
    navigate({ to: '/' });
  };

  return (
    <AuthLayout imageUrl={loginImage} imageAlt="MoraPack - Servicio de envíos">
      <RegisterForm onSuccess={handleRegisterSuccess} onLoginClick={handleLoginClick} />
    </AuthLayout>
  );
}
