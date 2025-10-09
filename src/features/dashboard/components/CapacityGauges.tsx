import { CircularGauge } from './CircularGauge';
import { type CapacityData } from '@/types';

export interface CapacityGaugesProps {
  data: CapacityData;
}

export function CapacityGauges({ data }: CapacityGaugesProps) {
  return (
    <div className="flex items-center justify-around gap-8 py-8">
      <CircularGauge
        label="Capacidad Vuelos"
        percentage={data.flightsCapacity}
        color="blue"
      />
      <CircularGauge
        label="Capacidad Almacenes"
        percentage={data.warehouseCapacity}
        color="green"
      />
    </div>
  );
}

