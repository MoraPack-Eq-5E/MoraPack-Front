import { type AlertType } from '@/types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AlertItemProps {
  type: AlertType;
  message: string;
}

const alertConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
};

export function AlertItem({ type, message }: AlertItemProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-5 px-5 rounded-lg border',
        config.bgColor,
        config.borderColor
      )}
    >
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
      <p className={cn('text-sm', config.textColor)}>{message}</p>
    </div>
  );
}

