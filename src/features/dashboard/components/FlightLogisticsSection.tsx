import { FlightsTable } from './FlightsTable';
import { type FlightSchedule } from '@/types';

export interface FlightLogisticsSectionProps {
  flights: FlightSchedule[];
}

export function FlightLogisticsSection({ flights }: FlightLogisticsSectionProps) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Logística de Plan de Vuelos</h2>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Próximos Vuelos</h3>
        </div>
        <FlightsTable flights={flights} />
      </div>
    </div>
  );
}

