'use client';

import { useState } from 'react';

export interface UsagePoint {
  label: string;
  iso: string;
  count: number;
}

interface UsageChartProps {
  data: UsagePoint[];
  /** How many x-axis labels to show (the rest are skipped to avoid crowding). */
  maxLabels?: number;
}

// Fixed coordinate space; the SVG scales to its container width.
const W = 720;
const H = 240;
const PAD = { top: 22, right: 10, bottom: 26, left: 38 };

export function UsageChart({ data: rawData, maxLabels = 7 }: UsageChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const data = rawData ?? [];
  const n = data.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.count));

  const slot = plotW / Math.max(1, n);
  const barW = Math.max(2, slot * 0.6);

  const x = (i: number) => PAD.left + i * slot + (slot - barW) / 2;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  // Pick a "nice" top gridline value at/above max.
  const niceMax = niceCeil(max);
  const gridVals = [0, niceMax / 2, niceMax];

  const labelStride = Math.max(1, Math.ceil(n / maxLabels));

  const allZero = data.every((d) => d.count === 0);

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="API usage over time"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Gridlines + y labels */}
        {gridVals.map((gv, i) => {
          const gy = PAD.top + plotH - (gv / niceMax) * plotH;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={gy}
                y2={gy}
                stroke="var(--pg-border)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : '2 4'}
                opacity={i === 0 ? 0.9 : 0.5}
              />
              <text
                x={PAD.left - 8}
                y={gy + 3.5}
                textAnchor="end"
                fontSize={10}
                fontFamily="var(--pg-mono)"
                fill="var(--pg-text3)"
              >
                {formatNum(gv)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const bh = (d.count / niceMax) * plotH;
          const isHover = hover === i;
          return (
            <g key={d.iso}>
              {/* invisible full-height hit area for easy hover */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <rect
                x={x(i)}
                y={d.count === 0 ? PAD.top + plotH - 1.5 : y(d.count)}
                width={barW}
                height={d.count === 0 ? 1.5 : Math.max(1.5, bh)}
                rx={Math.min(3, barW / 2)}
                fill={isHover ? 'var(--pg-cyan-hi)' : 'var(--pg-cyan)'}
                opacity={d.count === 0 ? 0.35 : isHover ? 1 : 0.82}
                style={{ transition: 'opacity 120ms ease, fill 120ms ease' }}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* X labels (sparse) */}
        {data.map((d, i) =>
          i % labelStride === 0 || i === n - 1 ? (
            <text
              key={'lbl' + d.iso}
              x={PAD.left + i * slot + slot / 2}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--pg-mono)"
              fill="var(--pg-text3)"
            >
              {d.label}
            </text>
          ) : null
        )}

        {/* Hover readout */}
        {hover !== null && (() => {
          const d = data[hover];
          const cx = PAD.left + hover * slot + slot / 2;
          const boxW = 96;
          const bx = Math.min(Math.max(cx - boxW / 2, PAD.left), W - PAD.right - boxW);
          return (
            <g pointerEvents="none">
              <line x1={cx} x2={cx} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--pg-cyan)" strokeWidth={1} opacity={0.35} />
              <rect x={bx} y={2} width={boxW} height={34} rx={7} fill="var(--pg-surface, #161a18)" stroke="var(--pg-border)" />
              <text x={bx + boxW / 2} y={15} textAnchor="middle" fontSize={10} fontFamily="var(--pg-mono)" fill="var(--pg-text2)">
                {d.label}
              </text>
              <text x={bx + boxW / 2} y={29} textAnchor="middle" fontSize={12} fontFamily="var(--pg-mono)" fill="var(--pg-text)">
                {d.count.toLocaleString()} req
              </text>
            </g>
          );
        })()}
      </svg>

      {allZero && (
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--pg-text3)', marginTop: 10 }}>
          No traffic in this window yet — make a request with one of your keys and it’ll show up here.
        </p>
      )}
    </div>
  );
}

function niceCeil(v: number): number {
  if (v <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function formatNum(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return String(Math.round(v));
}
