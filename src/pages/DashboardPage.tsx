/**
 * DashboardPage
 * 
 * Página principal del dashboard.
 * 
 * El layout (TopBar y Sidebar) es manejado por el Layout Route (_authenticated).
 */

export function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-2">Bienvenido a MoraPack</p>
    </div>
  );
}

