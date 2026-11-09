import { useEffect, useState } from 'react';

/** Seconds remaining until `isoDate` (0 when passed), updated every second. */
export function useCountdown(isoDate: string | null): number {
  const compute = () =>
    isoDate ? Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / 1000)) : 0;
  const [seconds, setSeconds] = useState(compute);
  useEffect(() => {
    setSeconds(compute());
    const id = setInterval(() => setSeconds(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoDate]);
  return seconds;
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
