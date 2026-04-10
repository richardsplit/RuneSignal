import React from 'react';

/* ── Pulse animation injected once ─────────────────────────────────── */
const PULSE_STYLE = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.skeleton-pulse {
  animation: skeletonPulse 1.6s ease-in-out infinite;
  background: var(--bg-surface-3);
  border-radius: 4px;
}
`;

function InjectStyle() {
  return <style>{PULSE_STYLE}</style>;
}

/* ── Base block ─────────────────────────────────────────────────────── */
interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export function SkeletonBlock({ width = '100%', height = 14, style }: SkeletonBlockProps) {
  return (
    <>
      <InjectStyle />
      <div
        className="skeleton-pulse"
        style={{ width, height, display: 'inline-block', ...style }}
      />
    </>
  );
}

/* ── Table row skeleton ─────────────────────────────────────────────── */
interface SkeletonRowProps {
  cols: (string | number)[];  // widths for each cell
  height?: number;
}

export function SkeletonRow({ cols, height = 14 }: SkeletonRowProps) {
  return (
    <tr>
      {cols.map((w, i) => (
        <td
          key={i}
          style={{
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <SkeletonBlock width={w} height={height} />
        </td>
      ))}
    </tr>
  );
}

/* ── Table body skeleton (N rows) ───────────────────────────────────── */
interface SkeletonTableProps {
  rows?: number;
  cols: (string | number)[];
}

export function SkeletonTable({ rows = 5, cols }: SkeletonTableProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

/* ── KPI card skeleton ──────────────────────────────────────────────── */
export function SkeletonKpi() {
  return (
    <div style={{ background: 'var(--bg-surface-1)', padding: '1.25rem 1.5rem' }}>
      <SkeletonBlock width="60%" height={10} style={{ marginBottom: '0.875rem' }} />
      <SkeletonBlock width="40%" height={28} />
    </div>
  );
}

/* ── Inline error banner ────────────────────────────────────────────── */
interface ApiErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function ApiErrorBanner({ message, onRetry }: ApiErrorBannerProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--danger-border)',
      background: 'var(--danger-bg)',
      fontSize: '0.8125rem',
      marginBottom: '1.5rem',
    }}>
      <span style={{ color: 'var(--danger)', fontWeight: 700, flexShrink: 0 }}>!</span>
      <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
        {message ?? 'Failed to load data from the API.'}
        {' '}Showing cached demo data.
      </span>
      {onRetry && (
        <button
          className="btn btn-outline"
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem', flexShrink: 0 }}
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}
