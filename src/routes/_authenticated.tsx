/**
 * Authenticated Layout Route
 * 
 * Layout compartido para todas las rutas autenticadas.
 * Incluye TopBar y Sidebar, y posiciona el contenido correctamente.
 * 
 * Todas las rutas hijas se renderizarán dentro del <Outlet />.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';
import { TopBar, Sidebar } from '@/components/layout';
import { LAYOUT } from '@/constants';

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <Sidebar />
      
      {/* Main content area - todas las páginas hijas se renderizan aquí */}
      <main 
        className="fixed top-16 bottom-0 right-0" 
        style={{ left: `${LAYOUT.SIDEBAR_WIDTH}px` }}
      >
        <Outlet />
      </main>
    </div>
  );
}
