import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.2)]',
      outline: 'bg-transparent border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700',
      ghost: 'bg-transparent text-zinc-500 hover:text-white'
    };
    const sizes = {
      sm: 'px-6 py-2 text-[10px]',
      md: 'px-8 py-3.5 text-[11px]',
      lg: 'px-12 py-5 text-sm'
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-[#0C0C0E] border border-zinc-900 rounded-[2.5rem]', className)} {...props} />
);

export const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'warning' }) => {
  const variants = {
    default: 'bg-zinc-900 text-zinc-500 border-zinc-800',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-red-500/10 text-red-500 border-red-500/20'
  };
  return (
    <div className={cn('px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ', variants[variant], className)} {...props} />
  );
};

export const Progress = ({ value = 0, className }: { value?: number, className?: string }) => (
  <div className={cn('w-full bg-zinc-900 rounded-full h-2 overflow-hidden', className)}>
    <div
      className="h-full bg-emerald-500 shadow-[0_0_15px_#10B981] transition-all duration-1000"
      style={{ width: `${value}%` }}
    />
  </div>
);
