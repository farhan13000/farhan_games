import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastTone } from '../../store/toastStore';

const ICONS: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const TONES: Record<ToastTone, string> = {
  info: 'text-brand-600',
  success: 'text-emerald-600',
  error: 'text-xmark-dark',
  warning: 'text-amber-600',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur"
          >
            <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', TONES[t.tone])} aria-hidden="true" />
            <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-lg p-0.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
