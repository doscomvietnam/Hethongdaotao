import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export function AdminModal({ open, onClose, title, subtitle, children, footer, size = 'lg' }: AdminModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full bg-[#0C0C0E] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden',
        'animate-in slide-in-from-bottom-4 zoom-in-95 duration-300',
        widths[size]
      )}>
        <div className="flex items-start justify-between p-8 border-b border-zinc-900">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{title}</h2>
            {subtitle && <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="p-6 border-t border-zinc-900 bg-zinc-950/50 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, required, hint, children }: FieldProps) {
  // Dùng <div> thay vì <label> để tránh browser auto-trigger control đầu tiên
  // khi click label (đặc biệt với hidden file input bên trong).
  return (
    <div className="block space-y-2">
      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {children}
      {hint && <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{hint}</div>}
    </div>
  );
}

const inputBase = 'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 font-bold disabled:opacity-50 transition-colors';

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputBase, className)} {...props} />
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputBase, 'min-h-[80px] resize-y', className)} {...props} />
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(inputBase, 'cursor-pointer', className)} {...props} />
);

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Xác nhận', onConfirm, onCancel, loading, variant = 'danger' }: ConfirmDialogProps) {
  return (
    <AdminModal
      open={open}
      onClose={onCancel}
      title={title}
      size="md"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50',
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
            )}
          >
            {loading ? 'ĐANG XỬ LÝ...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-300 font-bold leading-relaxed">{message}</p>
    </AdminModal>
  );
}
