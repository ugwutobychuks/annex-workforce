'use client';
import { useEffect, useState } from 'react';

/**
 * Returns a refetch interval (ms) for React Query that pauses when the tab
 * is not visible. This gives near-real-time updates without WebSockets.
 *
 * Usage:
 *   const refetchInterval = useLivePollInterval(15000);
 *   useQuery({ ..., refetchInterval });
 */
export function useLivePollInterval(intervalMs: number = 15000): number | false {
  const [visible, setVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible ? intervalMs : false;
}
