/**
 * TopBar Component
 * Barra superior de navegación con logo y botón de logout
 */

import { LogOut } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import logoImage from '@/assets/icons/logo.png';

export function TopBar() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // TODO: Implementar lógica de logout (limpiar tokens, etc.)
    navigate({ to: '/' });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src={logoImage} 
            alt="MoraPack Logo" 
            className="h-8 w-auto"
          />
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}

