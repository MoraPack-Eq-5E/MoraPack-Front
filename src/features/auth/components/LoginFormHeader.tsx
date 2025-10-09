/**
 * LoginFormHeader Component
 * Logo y título del formulario de login
 */

import { AUTH_MESSAGES } from '@/constants';
import logoImage from '@/assets/icons/logo.png';

export function LoginFormHeader() {
  return (
    <div className="mb-8 text-center">
      <div className="flex items-center justify-center mb-6">
        <img 
          src={logoImage} 
          alt="MoraPack Logo" 
          className="h-12 w-auto"
        />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {AUTH_MESSAGES.LOGIN.TITLE}
      </h1>
      <p className="text-gray-600">{AUTH_MESSAGES.LOGIN.SUBTITLE}</p>
    </div>
  );
}

