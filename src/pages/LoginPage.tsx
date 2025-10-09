/**
 * LoginPage
 * Página de inicio de sesión
 */

import { useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import loginImage from '@/assets/images/login-image.jpg';

export function LoginPage() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    // Navegar al dashboard después del login exitoso
    navigate({ to: '/dashboard' });
  };

  const handleRegisterClick = () => {
    // TODO: Navegar a registro cuando se implemente
    console.log('Navegar a registro');
    // navigate({ to: '/register' });
  };

  return (
    <AuthLayout imageUrl={loginImage} imageAlt="MoraPack - Servicio de envíos">
      <LoginForm onSuccess={handleLoginSuccess} onRegisterClick={handleRegisterClick} />
    </AuthLayout>
  );
}

