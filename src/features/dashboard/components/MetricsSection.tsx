import { MetricCard } from './MetricCard';
import { type DashboardMetrics } from '@/types';

export interface MetricsSectionProps {
  metrics: DashboardMetrics;
}

export function MetricsSection({ metrics }: MetricsSectionProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Métricas Clave</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Vuelos activos"
          value={metrics.activeFlights.toLocaleString()}
          change={metrics.changes.activeFlights}
        />
        <MetricCard
          label="En almacén"
          value={metrics.inWarehouse}
          change={metrics.changes.inWarehouse}
        />
        <MetricCard
          label="% cumplimiento SLA"
          value={`${metrics.slaCompliance}%`}
          change={metrics.changes.slaCompliance}
        />
        <MetricCard
          label="Paquetes retrasados/incumplidos"
          value={metrics.delayedPackages}
          change={metrics.changes.delayedPackages}
        />
      </div>
    </div>
  );
}

