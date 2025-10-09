import { cn } from '@/lib/cn';
import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-[#0066CC]/30 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors cursor-pointer',
              'pr-8',
              error ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300',
              className
            )}
            ref={ref}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
        {error && (
          <div className="h-5 mt-1">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };

