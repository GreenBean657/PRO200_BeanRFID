import React, { useMemo, useState } from 'react';
import { DailyAttendance } from '../types';
import './AttendanceChart.css';

interface Props {
  data: DailyAttendance[];
}

// Layout constants for the SVG viewBox. The chart scales to its container width
// via preserveAspectRatio, so these are just internal coordinates.
const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 36, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function formatDay(date: string): string {
  // date is "YYYY-MM-DD"; render as "M/D" without constructing a Date (avoids
  // timezone shifting the day backward).
  const [, m, d] = date.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default function AttendanceChart({ data }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const average = useMemo(() => {
    if (!data.length) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.rate, 0) / data.length);
  }, [data]);

  if (!data.length) {
    return (
      <div className="chart-wrapper">
        <div className="chart-empty">No attendance history yet.</div>
      </div>
    );
  }

  const n = data.length;
  const slot = PLOT_W / n;
  const barW = Math.min(slot * 0.6, 28);
  const yFor = (rate: number) => PAD.top + PLOT_H * (1 - rate / 100);

  // Show at most ~12 x-axis labels so dense ranges stay readable.
  const labelEvery = Math.ceil(n / 12);

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Attendance Trend</h3>
          <p className="chart-subtitle">Daily present rate · {n} days</p>
        </div>
        <div className="chart-average">
          <span className="chart-average-value">{average}%</span>
          <span className="chart-average-label">avg present</span>
        </div>
      </div>

      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Day-by-day attendance present rate"
      >
        {/* Horizontal gridlines + y-axis labels at 0/25/50/75/100% */}
        {[0, 25, 50, 75, 100].map(t => (
          <g key={t}>
            <line
              className="chart-gridline"
              x1={PAD.left}
              y1={yFor(t)}
              x2={W - PAD.right}
              y2={yFor(t)}
            />
            <text className="chart-axis-label" x={PAD.left - 8} y={yFor(t) + 3} textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = yFor(d.rate);
          const isHover = hover === i;
          return (
            <g key={d.date}>
              <rect
                className={`chart-bar${isHover ? ' chart-bar-hover' : ''}`}
                x={x}
                y={y}
                width={barW}
                height={PAD.top + PLOT_H - y}
                rx={3}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {/* Invisible full-height hit area so hover works on short bars too */}
              <rect
                className="chart-bar-hit"
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={PLOT_H}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % labelEvery === 0 && (
                <text
                  className="chart-axis-label"
                  x={PAD.left + i * slot + slot / 2}
                  y={H - PAD.bottom + 18}
                  textAnchor="middle"
                >
                  {formatDay(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="chart-tooltip">
          <span className="chart-tooltip-date">{formatDay(data[hover].date)}</span>
          <span className="chart-tooltip-rate">{data[hover].rate}% present</span>
          <span className="chart-tooltip-count">
            {data[hover].present} of {data[hover].total} students
          </span>
        </div>
      )}
    </div>
  );
}
