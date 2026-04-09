"use client";

import { useState } from "react";

type TrendPoint = {
  date: string;
  score: number;
  cumulative: number;
  isWin: boolean;
  detail?: string;
};

export function ScoreTrendChart({ points, label, prevScore, prevRangeLabel }: {
  points: TrendPoint[];
  label: string;
  prevScore?: number | null;
  prevRangeLabel?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) return null;

  const svgW = 600;
  const svgH = 200;
  const padL = 44;
  const padR = 20;
  const padT = 24;
  const padB = 36;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const values = points.map((p) => p.cumulative);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const valRange = maxVal - minVal || 1;

  const toX = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const toY = (v: number) => padT + (1 - (v - minVal) / valRange) * plotH;

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.cumulative)}`).join(" ");
  const areaPath = `M${padL},${padT + plotH} ${points.map((p, i) => `L${toX(i)},${toY(p.cumulative)}`).join(" ")} L${toX(points.length - 1)},${padT + plotH} Z`;

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = valRange / 4;
  for (let i = 0; i <= 4; i++) yTicks.push(Math.round(minVal + step * i));

  const zeroY = toY(0);
  const hp = hoverIdx !== null ? points[hoverIdx] : null;
  const hpX = hoverIdx !== null ? toX(hoverIdx) : 0;
  const hpY = hp ? toY(hp.cumulative) : 0;
  const lastPt = points[points.length - 1];

  // Delta arrow SVG inline
  const upArrow = "M5 2l3.5 5.5h-7z";
  const downArrow = "M5 8L1.5 2.5h7z";

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">{label}</p>
        {prevScore != null && prevRangeLabel && (() => {
          const delta = lastPt.cumulative - prevScore;
          return (
            <div className="flex items-center gap-1">
              <span className={`text-base font-bold tabular-nums ${delta >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
              <span className="text-xs text-[var(--bp-muted)] opacity-60">{prevRangeLabel}</span>
            </div>
          );
        })()}
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--bp-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--bp-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis ticks + grid */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} x2={svgW - padR} y1={toY(tick)} y2={toY(tick)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={padL - 8} y={toY(tick) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="11" fontFamily="inherit">
              {tick}
            </text>
          </g>
        ))}

        {/* Zero line */}
        {minVal < 0 && maxVal > 0 && (
          <line x1={padL} x2={svgW - padR} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {/* X-axis date labels */}
        {points.map((pt, idx) => {
          // Show every 3rd label, plus first and last
          const show = idx === 0 || idx === points.length - 1 || idx % 3 === 0;
          if (!show) return null;
          return (
            <text key={idx} x={toX(idx)} y={svgH - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="inherit">
              {pt.date.slice(5)}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendAreaFill)" />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="var(--bp-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(p.cumulative)}
            r={hoverIdx === i ? 6 : 3.5}
            fill={p.isWin ? "var(--bp-success)" : "var(--bp-danger)"}
            stroke={hoverIdx === i ? "var(--bp-ink)" : "none"}
            strokeWidth={hoverIdx === i ? 2 : 0}
          />
        ))}

        {/* Hover: vertical dotted line + tooltip */}
        {hp && hoverIdx !== null && (() => {
          const tooltipW = 160;
          const tooltipH = hp.detail ? 78 : 64;
          const flipLeft = hoverIdx > points.length * 0.6;
          const tx = flipLeft ? hpX - tooltipW - 12 : hpX + 12;
          const ty = Math.max(padT, Math.min(hpY - tooltipH / 2, padT + plotH - tooltipH));

          return (
            <>
              <line x1={hpX} x2={hpX} y1={padT} y2={padT + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={padL} x2={svgW - padR} y1={hpY} y2={hpY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3" />

              <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx="10" fill="#141414" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* Date + W/L */}
              <text x={tx + 12} y={ty + 18} fill="var(--bp-ink)" fontSize="12" fontWeight="600" fontFamily="inherit">
                {hp.date}
              </text>
              <text x={tx + tooltipW - 12} y={ty + 18} textAnchor="end" fill={hp.isWin ? "var(--bp-success)" : "var(--bp-danger)"} fontSize="11" fontWeight="700" fontFamily="inherit">
                {hp.isWin ? "WIN" : "LOSS"}
              </text>

              {/* Score delta with arrow */}
              <g transform={`translate(${tx + 12}, ${ty + 30})`}>
                <svg viewBox="0 0 10 10" width="12" height="12" fill={hp.score >= 0 ? "var(--bp-success)" : "var(--bp-danger)"}>
                  <path d={hp.score >= 0 ? upArrow : downArrow} />
                </svg>
              </g>
              <text x={tx + 28} y={ty + 41} fill={hp.score >= 0 ? "var(--bp-success)" : "var(--bp-danger)"} fontSize="14" fontWeight="800" fontFamily="inherit">
                {hp.score > 0 ? "+" : ""}{hp.score}pts
              </text>

              {/* Detail line — what was correct/wrong */}
              {hp.detail && (
                <text x={tx + 12} y={ty + 57} fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="inherit">
                  {hp.detail}
                </text>
              )}

              {/* Cumulative total */}
              <text x={tx + 12} y={ty + (hp.detail ? 71 : 57)} fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="inherit">
                Total:
              </text>
              <text x={tx + 52} y={ty + (hp.detail ? 71 : 57)} fill="var(--bp-accent)" fontSize="12" fontWeight="700" fontFamily="inherit">
                {hp.cumulative}
              </text>
            </>
          );
        })()}

        {/* Invisible hover areas */}
        {points.map((_, i) => {
          const barW = plotW / points.length;
          return (
            <rect
              key={`h-${i}`}
              x={toX(i) - barW / 2}
              y={padT}
              width={barW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              style={{ cursor: "crosshair" }}
            />
          );
        })}
      </svg>
    </div>
  );
}
