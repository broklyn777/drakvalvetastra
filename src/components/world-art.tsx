import { useId } from 'react';
/** Original vector scenery: self-contained, no third-party images or network fonts. */
export function WorldArt({ compact = false }: { compact?: boolean }) {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      className={`world-art ${compact ? 'compact' : ''}`}
      viewBox="0 0 1000 580"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      role="img"
      aria-label="Det gamla vakttornet reser sig över Gråskogens dimmiga berg"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#173437" />
          <stop offset="1" stopColor="#091311" />
        </linearGradient>
        <linearGradient id={`${id}-mist`} x2="0" y2="1">
          <stop stopColor="#a2b0a0" stopOpacity=".12" />
          <stop offset="1" stopColor="#8d9e8b" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-moon`}>
          <stop stopColor="#d3c59b" stopOpacity=".15" />
          <stop offset="1" stopColor="#d3c59b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-stone`}>
          <stop stopColor="#172522" />
          <stop offset=".5" stopColor="#34433b" />
          <stop offset="1" stopColor="#14211e" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h1000v580H0z" />
      <circle cx="680" cy="155" r="155" fill={`url(#${id}-moon)`} />
      <circle cx="680" cy="155" r="39" fill="#cec5a5" opacity=".65" />
      {Array.from({ length: 32 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 137 + 50) % 1000}
          cy={(i * 73 + 20) % 270}
          r={i % 3 === 0 ? 1.3 : 0.7}
          fill="#cad0bb"
          opacity=".35"
        />
      ))}
      <path
        d="M0 350 90 272 167 321 294 194 390 322 520 230 673 352 801 250 1000 353V580H0Z"
        fill="#1e3532"
      />
      <path d="m0 402 175-89 146 97 151-94 118 91 169-91 241 89v175H0Z" fill="#152b27" />
      <path d="m0 425 158-9 137 45 182-22 164-75 138 81 221-44v179H0Z" fill="#0c1e1a" />
      <path d="m449 469 36-90 40-17 47-59 67 4 61 58 36 85 73 65H418Z" fill="#1b2923" />
      <path
        d="m533 365 12-181 8-2v-35h18v17h19v-22h17v23h17v-17h20v40l14 177Z"
        fill={`url(#${id}-stone)`}
      />
      <path
        d="m545 204 96-5m-97 27 99-4m-100 29 103-4m-105 29 107-5m-108 29 110-4m-111 30 113-4m-96-151-2 166m26-168 1 168m28-167 5 172"
        stroke="#61715d"
        strokeOpacity=".12"
      />
      <path d="M583 213q0-17 14-17t14 17v22h-28z" fill="#b9944b" opacity=".55" />
      <path d="M582 329q0-25 17-25t17 25v41h-34z" fill="#070f0c" />
      <path d="m546 188 15 10-8 24 16 19-14 13 10 31" stroke="#0a1712" strokeWidth="4" />
      <path
        d="m579 401 41 17-58 27 42 18-88 24 39 28-90 42"
        stroke="#68735a"
        strokeOpacity=".24"
        strokeWidth="9"
      />
      {[...Array(32)].map((_, i) => {
        const x = ((i * 43) % 1040) - 20,
          y = 370 + ((i * 37) % 160),
          h = 50 + ((i * 19) % 105);
        return (
          <g key={i} fill={i % 2 ? '#081711' : '#10241b'}>
            <path
              d={`M${x} ${y - h}l${h * 0.3} ${h * 0.68}h-${h * 0.16}l${h * 0.28} ${h * 0.38}h-${h * 0.84}l${h * 0.28}-${h * 0.38}h-${h * 0.16}Z`}
            />
            <path d={`M${x - 2} ${y}h4v22h-4z`} />
          </g>
        );
      })}
      <ellipse cx="270" cy="430" rx="410" ry="35" fill={`url(#${id}-mist)`} />
      <ellipse cx="780" cy="465" rx="350" ry="39" fill={`url(#${id}-mist)`} />
      <path d="M0 536q300-28 496 0t504-11v55H0Z" fill="#08120f" />
    </svg>
  );
}
