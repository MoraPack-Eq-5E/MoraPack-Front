/**
 * TopBar Component
 * Barra superior de navegación con logo
 */

import logoImage from '@/assets/icons/logo.png';

export function TopBar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src={logoImage} 
            alt="MoraPack Logo" 
            className="h-8 w-auto"
          />
        </div>
      </div>
    </header>
  );
}

