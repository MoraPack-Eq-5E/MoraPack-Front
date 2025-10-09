import { Select, type SelectOption } from '@/components/ui';
import { type Sede } from '@/types';

export interface DashboardHeaderProps {
  selectedSede: string;
  onSedeChange: (sedeId: string) => void;
  sedes: Sede[];
}

export function DashboardHeader({ selectedSede, onSedeChange, sedes }: DashboardHeaderProps) {
  const sedeOptions: SelectOption[] = sedes.map((sede) => ({
    value: sede.id,
    label: sede.name,
  }));

  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="flex items-center gap-3">
        <label htmlFor="sede-select" className="text-sm font-medium text-gray-700">
          Sede:
        </label>
        <div className="w-48">
          <Select
            id="sede-select"
            value={selectedSede}
            onChange={(e) => onSedeChange(e.target.value)}
            options={sedeOptions}
          />
        </div>
      </div>
    </div>
  );
}

