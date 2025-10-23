/**
 * RegisterFormHeader Component
 * Header del formulario de registro con logo y título
 */

import { AUTH_MESSAGES } from '@/constants';
import logoImage from '@/assets/icons/logo.png';

export function RegisterFormHeader() {
  return (
    <header className="mb-8 text-center">
      <div className="flex items-center justify-center mb-6">
        <img 
          src={logoImage} 
          alt="MoraPack Logo" 
          className="h-12 w-auto"
        />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {AUTH_MESSAGES.REGISTER.TITLE}
      </h1>
      <p className="text-gray-600">{AUTH_MESSAGES.REGISTER.SUBTITLE}</p>
    </header>
  );
}