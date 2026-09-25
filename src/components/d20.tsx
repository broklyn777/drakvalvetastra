'use client';

import { useEffect, useRef, useState } from 'react';

type Outcome = 'success' | 'failure' | 'crit';

export function DiceBox({
  rolling,
  value,
  sides,
  outcome,
}: {
  rolling: boolean;
  value?: number;
  sides: number;
  outcome?: Outcome;
}) {
  const [shown, setShown] = useState('?');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rolling) return;
    let ticks = 0;
    const tick = () => {
      setShown(String(1 + Math.floor(Math.random() * sides)));
      ticks += 1;
      if (ticks < 9) timer.current = setTimeout(tick, 70);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [rolling, sides]);

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
      className={`gemini-die ${outcome ?? 'idle'} ${rolling ? 'rolling' : ''}`}
      role="img"
      aria-label={value !== undefined ? `d${sides} visar ${value}` : `d${sides}`}
    >
      <small>D{sides}</small>
      <strong>{shown}</strong>
    </div>
  );
}

export function D20({
  rolling,
  value,
  outcome,
}: {
  rolling: boolean;
  value?: number;
  outcome?: Outcome;
}) {
  return <DiceBox rolling={rolling} value={value} sides={20} outcome={outcome} />;
}
