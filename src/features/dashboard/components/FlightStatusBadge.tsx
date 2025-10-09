import { cn } from '@/lib/cn';
import { type FlightStatus } from '@/types';

export interface FlightStatusBadgeProps {
  status: FlightStatus;
}

export function FlightStatusBadge({ status }: FlightStatusBadgeProps) {
  const isDelayed = status === 'retrasado';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
        isDelayed
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isDelayed ? 'bg-blue-500' : 'bg-green-500'
        )}
      />
      {isDelayed ? 'Retrasado' : 'Programado'}
    </span>
  );
}

