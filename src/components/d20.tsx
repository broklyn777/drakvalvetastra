'use client';

import { useEffect, useRef, useState } from 'react';

type Outcome = 'success' | 'failure' | 'crit';

const palette: Record<Outcome | 'idle', { fill: string; stroke: string; front: string }> = {
  idle: { fill: '#1c2b20', stroke: '#c5a059', front: '#243528' },
  success: { fill: '#1f3322', stroke: '#9fbf7a', front: '#26402a' },
  failure: { fill: '#2e1f1b', stroke: '#c9725f', front: '#3a2621' },
  crit: { fill: '#2c2a17', stroke: '#e8c76a', front: '#3a361c' },
};

export function D20({
  rolling,
  value,
  outcome,
}: {
  rolling: boolean;
  value?: number;
  outcome?: Outcome;
}) {
  const [shown, setShown] = useState<string>('?');
  const [anim, setAnim] = useState<'' | 'roll' | 'land'>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!rolling || reduceMotion) return;
    setAnim('roll');
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
  }, [rolling, reduceMotion]);

  useEffect(() => {
    if (value === undefined) {
      if (!rolling) setShown('?');
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setShown(String(value));
    setAnim(reduceMotion ? '' : 'land');
    try {
      navigator.vibrate?.(value === 20 ? 35 : 18);
    } catch {
      // Optional feedback only.
    }
  }, [value, rolling, reduceMotion]);

  const colours = palette[value !== undefined && outcome ? outcome : 'idle'];

  return (
    <svg
      className={`d20-svg ${anim}`}
      viewBox="0 0 100 104"
      role="img"
      aria-label={value !== undefined ? `d20 visar ${value}` : 'd20'}
      onAnimationEnd={() => setAnim('')}
    >
      {outcome === 'crit' && !reduceMotion && (
        <circle
          className="d20-burst"
          cx="50"
          cy="52"
          r="48"
          fill="none"
          stroke="#e8c76a"
          strokeWidth="2"
        />
      )}
      <polygon
        points="50,4 92,28 92,76 50,100 8,76 8,28"
        fill={colours.fill}
        stroke={colours.stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g stroke="#c5a05977" strokeWidth="1" fill="none">
        <polygon points="50,26 79,72 21,72" fill={colours.front} />
        <path d="M50 4V26M92 28L50 26M8 28L50 26M92 28L79 72M92 76L79 72M50 100L79 72M8 28L21 72M8 76L21 72M50 100L21 72" />
      </g>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="24"
        fontFamily="var(--serif)"
        fill="#e6dfcc"
      >
        {shown}
      </text>
    </svg>
  );
}
