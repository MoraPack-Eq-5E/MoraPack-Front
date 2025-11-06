/**
 * StatsCard
 * 
 * Tarjeta de estadística para mostrar métricas de simulación.
 * Se muestra en la parte inferior del mapa.
 */

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatsCard({ label, value, sublabel }: StatsCardProps) {
  return (
    <div className="bg-teal-600/95 rounded-xl p-4 shadow-xl backdrop-blur-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-teal-100 mb-1">
        {label}
      </div>
      <div className="text-3xl font-black tracking-tight text-white">
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-teal-200 mt-1">
          {sublabel}
        </div>
      )}
    </div>
  );
}
