/**
 * DashboardPage
 * Página principal del dashboard
 */

import { TopBar, Sidebar } from '@/components/layout';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <Sidebar />
      
      {/* Contenido principal con padding-top para el TopBar fijo y padding-left para el Sidebar */}
      <main className="pt-16" style={{ paddingLeft: '165px' }}>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Bienvenido a MoraPack</p>
        </div>
      </main>
    </div>
  );
}

