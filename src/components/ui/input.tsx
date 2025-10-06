import { cn } from '@/lib/cn';
import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            type={inputType}
          className={cn(
            'flex h-12 w-full rounded-md border bg-[#E8EEF3] px-4 py-3 text-base',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-1 focus:ring-[#0066CC]/30 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            error ? 'border-red-500 focus:ring-red-500/30' : 'border-transparent',
            isPassword && 'pr-10',
            className
          )}
            ref={ref}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        {/* Espacio reservado para el mensaje de error - siempre ocupa espacio */}
        <div className="h-5 mt-1">
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

