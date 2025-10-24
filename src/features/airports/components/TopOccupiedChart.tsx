/**
 * TopOccupiedChart
 * 
 * Gráfico de barras horizontales que muestra los 5 aeropuertos más ocupados
 */

import type { Airport } from '@/types';

export interface TopOccupiedChartProps {
  airports: Airport[];
}

export function TopOccupiedChart({ airports }: TopOccupiedChartProps) {
  // Calcular top 5 aeropuertos más ocupados
  const topAirports = airports
    .map((airport) => ({
      label: `${airport.codigoIATA} - ${airport.ciudad.nombre}`,
      ocupacion: airport.capacidadActual,
      maxima: airport.capacidadMaxima,
      porcentaje: airport.capacidadMaxima > 0 
        ? (airport.capacidadActual / airport.capacidadMaxima) * 100 
        : 0,
    }))
    .sort((a, b) => b.ocupacion - a.ocupacion)
    .slice(0, 5);

  // Si no hay datos
  if (topAirports.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Top 5 aeropuertos más ocupados
        </h2>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Top 5 aeropuertos más ocupados
      </h2>
      
      <div className="space-y-4">
        {topAirports.map((airport, index) => (
          <div key={index} className="flex items-center gap-4">
            {/* Label */}
            <div className="w-48 flex-shrink-0">
              <p className="text-sm font-medium text-gray-700 text-right">
                {airport.label}
              </p>
            </div>
            
            {/* Barra */}
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-blue-600 flex items-center justify-end pr-3"
                  style={{ width: `${Math.min(airport.porcentaje, 100)}%` }}
                >
                  <span className="text-xs font-medium text-white">
                    {Math.round(airport.porcentaje)}%
                  </span>
                </div>
              </div>
              
              {/* Valor */}
              <span className="text-sm font-bold text-gray-900 w-16 text-right">
                {airport.ocupacion}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

