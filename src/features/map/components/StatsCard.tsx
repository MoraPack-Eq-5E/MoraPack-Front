/**
 * StatsCard Component
 * 
 * Tarjeta de estadísticas flotante que muestra métricas en tiempo real del mapa.
 * Se posiciona absolutamente sobre el mapa en la esquina superior izquierda.
 */

interface StatsCardProps {
  flightsInAir: number;
  slaPct: number;
  warehousePct: number;
  now: string;
}

export function StatsCard({ flightsInAir, slaPct, warehousePct, now }: StatsCardProps) {
  return (
    <div className="absolute left-8 top-8 md:top-10 z-[1000]">
      <div className="w-[300px] rounded-xl border bg-white/95 shadow p-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold">{flightsInAir}</div>
          <div className="text-xs text-gray-500">
            <div>
              <span className="font-medium">{slaPct}%</span>{' '}
              <span className="opacity-70">SLA</span>
            </div>
            <div>
              <span className="font-medium">{warehousePct}%</span>{' '}
              <span className="opacity-70">Capacidad almacenes</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 border-t pt-3">
          <div className="text-sm font-medium">Tiempo real</div>
          <div className="text-xs text-gray-600">{now}</div>
        </div>
      </div>
    </div>
  );
}
