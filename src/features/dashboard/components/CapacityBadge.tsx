import { cn } from '@/lib/cn';

export interface CapacityBadgeProps {
  percentage: number;
}

export function CapacityBadge({ percentage }: CapacityBadgeProps) {
  const getColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 80) return 'bg-orange-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="inline-flex items-center">
      <span
        className={cn(
          'px-3 py-1 rounded-full text-white text-sm font-medium',
          getColor(percentage)
        )}
      >
        {percentage}%
      </span>
    </div>
  );
}

