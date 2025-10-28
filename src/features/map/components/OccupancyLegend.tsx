/**
 * OccupancyLegend - Leyenda de colores de ocupación de vuelos
 * 
 * Muestra una guía visual para entender los colores de los aviones
 */

export function OccupancyLegend() {
  const legendItems = [
    { color: '#059669', label: '< 70%', description: 'Moderada' },
    { color: '#eab308', label: '70-85%', description: 'Alta' },
    { color: '#f97316', label: '85-95%', description: 'Muy alta' },
    { color: '#ef4444', label: '> 95%', description: 'Casi lleno' },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-3 border border-gray-200 z-[1000]">
      <div className="flex items-center gap-6">
        <div className="text-sm font-semibold text-gray-700">
          Ocupación de vuelos:
        </div>
        <div className="flex items-center gap-4">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M2 14l8-2 3-8 2 2-2 6 7 3-1 2-7-1-4 5h-2l2-6-6-1z"
                  fill={item.color}
                />
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-700">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500">
                  {item.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

