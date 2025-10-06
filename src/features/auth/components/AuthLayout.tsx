/**
 * AuthLayout Component
 * Layout para páginas de autenticación con división imagen/formulario
 */

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  imageUrl: string;
  imageAlt?: string;
}

export function AuthLayout({ children, imageUrl, imageAlt = 'Auth background' }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo - Imagen */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Lado derecho - Formulario */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

