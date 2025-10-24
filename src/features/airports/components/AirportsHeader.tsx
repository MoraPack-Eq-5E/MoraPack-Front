/**
 * AirportsHeader
 * 
 * Header de la página de aeropuertos con título e ícono de notificación
 */

import { Bell } from 'lucide-react';

export function AirportsHeader() {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Aeropuertos</h1>
      <button 
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
}

