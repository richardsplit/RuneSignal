import React from 'react';

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  color?: string;
}

interface KpiStripProps {
  items: KpiItem[];
  loading?: boolean;
}

export function KpiStrip({ items, loading }: KpiStripProps) {
  return (
    <div className="kpi-strip">
      {items.map((k, i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-label">{k.label}</div>
          {loading
            ? <div className="skeleton-pulse" style={{ height: 28, width: '40%', borderRadius: 'var(--radius-xs)', marginTop: 2 }} />
            : <div className="kpi-value" style={k.color ? { color: k.color } : undefined}>{k.value}</div>
          }
        </div>
      ))}
    </div>
  );
}
