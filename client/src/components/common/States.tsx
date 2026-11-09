import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  action,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-xmark-light text-xmark-dark">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-ink/[0.06] ${className}`} aria-hidden="true" />
  );
}
