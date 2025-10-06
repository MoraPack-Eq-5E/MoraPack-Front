/**
 * LoginPage
 * Página de inicio de sesión
 */

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import loginImage from '@/assets/images/login-image.jpg';

export function LoginPage() {
  const handleLoginSuccess = () => {
    // TODO: Navegar al dashboard cuando se implemente el router
    console.log('Login exitoso - navegar al dashboard');
    // navigate('/dashboard');
  };

  const handleRegisterClick = () => {
    // TODO: Navegar a registro cuando se implemente
    console.log('Navegar a registro');
    // navigate('/register');
  };

  return (
    <AuthLayout imageUrl={loginImage} imageAlt="MoraPack - Servicio de envíos">
      <LoginForm onSuccess={handleLoginSuccess} onRegisterClick={handleRegisterClick} />
    </AuthLayout>
  );
}

