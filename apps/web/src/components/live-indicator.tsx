'use client';
import { useEffect, useState } from 'react';

/**
 * Small green dot that pulses every time data is refreshed.
 * Used near data that polls in the background, so users understand
 * "this is live" without us having to spell it out.
 */
export function LiveIndicator({ updatedAt }: { updatedAt?: number }) {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!updatedAt) return;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 1200);
    return () => clearTimeout(t);
  }, [updatedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          pulsing ? 'bg-emerald-500' : 'bg-emerald-400/70'
        } transition-colors`}
        style={pulsing ? { boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)' } : undefined}
      />
      Live
    </span>
  );
}
