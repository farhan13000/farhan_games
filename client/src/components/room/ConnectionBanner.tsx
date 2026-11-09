import clsx from 'clsx';
import { RefreshCw, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../../lib/socket';

/** Shows the local connection state; hidden while connected. */
export function ConnectionBanner({
  status,
  onRetry,
}: {
  status: ConnectionStatus;
  onRetry: () => void;
}) {
  if (status === 'connected' || status === 'idle') return null;
  const offline = status === 'offline';
  return (
    <div
      role="status"
      className={clsx(
        'mb-4 flex animate-fade-up items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold',
        offline
          ? 'border-xmark/20 bg-xmark-light/60 text-xmark-dark'
          : 'border-amber-200 bg-amber-50 text-amber-800',
      )}
    >
      <span className="flex items-center gap-2">
        {offline ? (
          <WifiOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {offline
          ? 'Connection lost. Your seat is saved during the grace period.'
          : status === 'connecting'
            ? 'Connecting to the game server…'
            : 'Reconnecting… your game is safe.'}
      </span>
      {offline && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold shadow-sm hover:bg-canvas"
        >
          Retry
        </button>
      )}
    </div>
  );
}
