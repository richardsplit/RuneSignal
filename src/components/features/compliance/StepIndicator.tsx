'use client';

interface Props {
  current: number;
  total: number;
}

const STEP_LABELS = ['Agents', 'Regulation', 'Date Range', 'Preview', 'Results'];

export function StepIndicator({ current, total }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2rem' }}>
      {STEP_LABELS.slice(0, total).map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {i > 0 && <div style={{ width: 24, height: 1, background: isDone ? 'var(--accent)' : 'var(--border-default)' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.625rem', fontWeight: 700,
                background: isActive ? 'var(--accent)' : isDone ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: isActive ? 'var(--text-inverse)' : isDone ? 'var(--accent)' : 'var(--text-tertiary)',
                border: isActive ? 'none' : isDone ? '1px solid var(--accent-border)' : '1px solid var(--border-default)',
              }}>
                {isDone ? '✓' : stepNum}
              </div>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
