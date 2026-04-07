"use client";

import { MotionReveal } from "@/components/motion-reveal";

interface MetricCardProps {
  label: string;
  value: string | number;
  footnote?: string;
  change?: number;
}

export function DashboardMetricCard({ label, value, footnote, change }: MetricCardProps) {
  return (
    <MotionReveal>
      <div className="dash-metric-card">
        <span className="dash-metric-label">{label}</span>
        <div className="dash-metric-value">{value}</div>
        {change !== undefined && (
          <span className={`dash-metric-change ${change > 0 ? "up" : change < 0 ? "down" : "neutral"}`}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "–"} {Math.abs(change)}%
          </span>
        )}
        {footnote && <span className="meta footnote">{footnote}</span>}
      </div>
    </MotionReveal>
  );
}
