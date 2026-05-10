import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  className,
  disabled,
  size = 'md',
  align = 'left',
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);
  const triggerSize = size === 'sm' ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-[11px]';

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={cn(
          'w-full inline-flex items-center justify-between gap-3 rounded-xl bg-zinc-900 border border-zinc-800',
          'text-zinc-200 font-black uppercase tracking-widest transition-all',
          'hover:border-zinc-700 focus:outline-none focus:border-emerald-500/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          triggerSize
        )}
      >
        <span className={cn('truncate text-left', !selected && 'text-zinc-500')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform flex-shrink-0', open && 'rotate-180 text-emerald-500')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-full rounded-2xl bg-[#0C0C0E] border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden',
            'animate-in fade-in slide-in-from-top-1 duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          style={{ minWidth: ref.current?.offsetWidth }}
        >
          <div className="max-h-72 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Không có lựa chọn</p>
            ) : options.map(opt => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors',
                    isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-[#999798] hover:bg-zinc-800/60 hover:text-white'
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] font-black uppercase tracking-widest truncate">{opt.label}</span>
                    {opt.hint && <span className="block text-[9px] font-bold text-zinc-600 tracking-wider mt-0.5 truncate">{opt.hint}</span>}
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
