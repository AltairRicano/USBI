import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center justify-center rounded-xl font-medium',
          'transition-transform hover:scale-105 active:scale-95',
          'disabled:pointer-events-none disabled:opacity-50',
          // Accesibilidad motriz (WCAG 2.5.5)
          'min-h-[44px] min-w-[44px]',
          // Foco visible (WCAG 2.4.11)
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[--color-primary] focus-visible:ring-offset-2',
          // Variantes
          {
            'bg-[--color-primary] text-white hover:bg-[--color-primary-hover]':
              variant === 'primary',
            'bg-[--color-secondary-dark] text-white hover:opacity-90':
              variant === 'secondary',
            'border-2 border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary] hover:text-white':
              variant === 'outline',
            'bg-[--color-error] text-white hover:opacity-90':
              variant === 'danger',
            'hover:bg-gray-100 text-gray-700':
              variant === 'ghost',
          },
          // Tamaños
          {
            'h-9 px-3 text-sm':   size === 'sm',
            'h-11 px-4 text-base': size === 'md',
            'h-14 px-8 text-lg':   size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
