import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface MetricCardProps {
  label: string;
  value: number | string;
  change: number;
  changeLabel?: string;
  icon?: ReactNode;
}

export function MetricCard({ label, value, change, changeLabel, icon }: MetricCardProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const displayChange = changeLabel || `${change > 0 ? '+' : ''}${change}%`;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <span
              className={cn(
                'text-sm font-medium',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                !isPositive && !isNegative && 'text-gray-600'
              )}
            >
              {displayChange}
            </span>
          </div>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}

