'use client';

import { useEffect, useRef, useState } from 'react';

type Outcome = 'success' | 'failure' | 'crit';

export function D20({
  rolling,
  value,
  outcome,
}: {
  rolling: boolean;
  value?: number;
  outcome?: Outcome;
}) {
  const [shown, setShown] = useState('?');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rolling) return;
    let ticks = 0;
    const tick = () => {
      setShown(String(1 + Math.floor(Math.random() * 20)));
      ticks += 1;
      if (ticks < 9) timer.current = setTimeout(tick, 70);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [rolling]);

  useEffect(() => {
    if (value === undefined) {
      if (!rolling) setShown('?');
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setShown(String(value));
  }, [value, rolling]);

  return (
    <div
      className={`gemini-d20 ${outcome ?? 'idle'} ${rolling ? 'rolling' : ''}`}
      role="img"
      aria-label={value !== undefined ? `d20 visar ${value}` : 'd20'}
    >
      {shown}
    </div>
  );
}
