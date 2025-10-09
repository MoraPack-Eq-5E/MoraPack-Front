import { AlertItem } from './AlertItem';
import { type Alert } from '@/types';

export interface AlertsSectionProps {
  alerts: Alert[];
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Alertas</h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} type={alert.type} message={alert.message} />
        ))}
      </div>
    </div>
  );
}

