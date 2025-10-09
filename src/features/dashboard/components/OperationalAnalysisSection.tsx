import { DeliveryChart } from './DeliveryChart';
import { CapacityGauges } from './CapacityGauges';
import { type DeliveryChartData, type CapacityData } from '@/types';

export interface OperationalAnalysisSectionProps {
  deliveryData: DeliveryChartData[];
  capacityData: CapacityData;
}

export function OperationalAnalysisSection({
  deliveryData,
  capacityData,
}: OperationalAnalysisSectionProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Análisis Operativo</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Paquetes Entregados (Últimos 7 Días)
          </h3>
          <DeliveryChart data={deliveryData} />
        </div>

        {/* Gauges de capacidad */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Uso de Capacidad actual
          </h3>
          <CapacityGauges data={capacityData} />
        </div>
      </div>
    </div>
  );
}

