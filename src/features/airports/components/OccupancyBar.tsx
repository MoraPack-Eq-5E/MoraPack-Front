/**
 * OccupancyBar
 * 
 * Barra de progreso que muestra la ocupación del aeropuerto
 * con colores según el porcentaje
 */

export interface OccupancyBarProps {
  porcentaje: number;
}

export function OccupancyBar({ porcentaje }: OccupancyBarProps) {
  // Determinar color según porcentaje
  let barColor = 'bg-blue-500'; // < 70%
  
  if (porcentaje >= 90) {
    barColor = 'bg-red-500'; // >= 90%
  } else if (porcentaje >= 70) {
    barColor = 'bg-yellow-500'; // >= 70%
  }

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(porcentaje, 100)}%` }}
        />
      </div>
    </div>
  );
}

