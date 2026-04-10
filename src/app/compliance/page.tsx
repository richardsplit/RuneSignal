'use client';
import { useState, useEffect } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Framework {
  id: string;
  name: string;
  description: string;
  version: string;
  controls_count: number;
  evidence_count: number;
  progress_pct: number;
}

interface Control {
  id: string;
  framework_id?: string;
  control_code: string;
  title: string;
  description: string;
  satisfied: boolean;
  evidence_types?: string[];
  evidence: any[];
}

interface EvidenceItem {
  id: string;
  tenant?: string;
  control_code?: string;
  confidence?: number;
  date?: string;
  created_at?: string;
  control?: Control;
}

/* ─── Jurisdiction badge map ─────────────────────────────────────────── */
const FRAMEWORK_META: Record<string, { jurisdiction: string; badgeCls: string }> = {
  'eu-ai-act':  { jurisdiction: 'EU',          badgeCls: 'badge badge-info'    },
  'nist-rmf':   { jurisdiction: 'US (NIST)',    badgeCls: 'badge badge-accent'  },
  'soc2':       { jurisdiction: 'AICPA / US',  badgeCls: 'badge badge-neutral' },
};

function jurisdictionFor(fw: Framework) {
  const key = fw.id?.toLowerCase().replace(/\s+/g, '-') ?? '';
  for (const [k, v] of Object.entries(FRAMEWORK_META)) {
    if (key.includes(k.replace('-', '')) || fw.name.toLowerCase().includes(k.replace('-', ''))) return v;
  }
  return { jurisdiction: 'International', badgeCls: 'badge badge-neutral' };
}

/* ─── Progress ring ─────────────────────────────────────────────────── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(pct, 100)) / 100;
  const color = pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="5" />
        <circle
          cx="34" cy="34" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.875rem', fontWeight: 700,
        color: 'var(--text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {pct}%
      </span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function ComplianceDashboard() {
  const [frameworks, setFrameworks]     = useState<Framework[]>([]);
  const [activeFw, setActiveFw]         = useState<Framework | null>(null);
  const [controls, setControls]         = useState<Control[]>([]);
  const [evidence, setEvidence]         = useState<EvidenceItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<'frameworks' | 'controls' | 'evidence'>('frameworks');

  /* ── Fetch frameworks on mount ── */
  useEffect(() => {
    fetch('/api/v1/compliance/frameworks')
      .then(r => r.json())
      .then(d => {
        setFrameworks(d.frameworks || []);
        if (d.frameworks?.length > 0) {
          setActiveFw(d.frameworks[0]);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  /* ── Fetch controls when active framework changes ── */
  useEffect(() => {
    if (activeFw) {
      fetch(`/api/v1/compliance/evidence?framework_id=${activeFw.id}`)
        .then(r => r.json())
        .then(d => {
          setControls(d.controls || []);
          /* Flatten evidence items from controls */
          const ev: EvidenceItem[] = [];
          (d.controls || []).forEach((c: Control) => {
            (c.evidence || []).forEach((e: any) => ev.push({ ...e, control: c }));
          });
          setEvidence(ev);
        })
        .catch(console.error);
    }
  }, [activeFw]);

  const handleAutoMine = async () => {
    await fetch('/api/v1/compliance/frameworks', { method: 'POST' });
    window.location.reload();
  };

  const handleExport = () => {
    if (!activeFw) return;
    const csvContent = 'data:text/csv;charset=utf-8,'
      + 'Control Code,Title,Satisfied,Evidence Count\n'
      + controls.map(c => `${c.control_code},"${c.title}",${c.satisfied},${c.evidence?.length || 0}`).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `RuneSignal_Compliance_Export_${activeFw.name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  /* ── Derived KPIs ── */
  const totalControls  = frameworks.reduce((s, f) => s + (f.controls_count || 0), 0);
  const totalEvidence  = frameworks.reduce((s, f) => s + (f.evidence_count || 0), 0);
  const satisfiedCount = controls.filter(c => c.satisfied).length;
  const avgProgress    = frameworks.length
    ? Math.round(frameworks.reduce((s, f) => s + (f.progress_pct || 0), 0) / frameworks.length)
    : 0;

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', paddingTop: '2rem' }}>
        <div className="empty-state">
          <p className="empty-state-title">Loading Intelligence Hub…</p>
          <p className="empty-state-body">Fetching compliance frameworks from the governance ledger.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Governance Intel</h1>
        <p className="page-description">
          Regulation-mapped compliance framework controls and evidence tracking.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--border-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: '1.75rem',
      }}>
        {[
          { label: 'Frameworks',          value: String(frameworks.length),  accentColor: undefined },
          { label: 'Total Controls',      value: String(totalControls),      accentColor: undefined },
          { label: 'Evidence Items',      value: String(totalEvidence),      accentColor: 'var(--accent)' },
          { label: 'Avg. Readiness',      value: `${avgProgress}%`,          accentColor: avgProgress >= 75 ? 'var(--success)' : avgProgress >= 40 ? 'var(--warning)' : 'var(--danger)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-surface-1)', padding: '1.25rem 1.5rem' }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.accentColor ?? undefined }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Tab bar */}
        <div className="tab-bar">
          {(['frameworks', 'controls', 'evidence'] as const).map(tab => (
            <button
              key={tab}
              className={`tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab}
              {tab === 'controls' && controls.length > 0 && (
                <span style={{ marginLeft: '0.375rem', opacity: 0.6, fontSize: '0.6875rem' }}>
                  ({controls.length})
                </span>
              )}
              {tab === 'evidence' && evidence.length > 0 && (
                <span style={{ marginLeft: '0.375rem', opacity: 0.6, fontSize: '0.6875rem' }}>
                  ({evidence.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
          <button onClick={handleAutoMine} className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>
            Auto-Mine Ledger
          </button>
          <button onClick={handleExport} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            Export Bundle
          </button>
        </div>
      </div>

      {/* ── Tab: Frameworks ── */}
      {activeTab === 'frameworks' && (
        <>
          {frameworks.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}>
              {frameworks.map(fw => {
                const { jurisdiction, badgeCls } = jurisdictionFor(fw);
                const progressColor = fw.progress_pct >= 75 ? 'var(--success)' : fw.progress_pct >= 40 ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div
                    key={fw.id}
                    className="surface"
                    style={{
                      cursor: 'pointer',
                      transition: 'background var(--t-fast)',
                      outline: activeFw?.id === fw.id ? '2px solid var(--accent-border)' : 'none',
                      outlineOffset: '-2px',
                    }}
                    onClick={() => { setActiveFw(fw); setActiveTab('controls'); }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-2)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  >
                    <div style={{ padding: '1.25rem' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            {fw.name}
                          </p>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>v{fw.version}</span>
                        </div>
                        <span className={badgeCls}>{jurisdiction}</span>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                        {fw.description}
                      </p>

                      {/* Stats + ring */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span className="kpi-label">Controls</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                            {fw.evidence_count}
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                              / {fw.controls_count}
                            </span>
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>satisfied</span>
                        </div>
                        <ProgressRing pct={fw.progress_pct} />
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        marginTop: '1rem',
                        height: '3px',
                        background: 'var(--border-subtle)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${fw.progress_pct}%`,
                          background: progressColor,
                          borderRadius: '2px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No frameworks loaded</p>
              <p className="empty-state-body">Click "Auto-Mine Ledger" to discover and map governance frameworks automatically.</p>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Controls ── */}
      {activeTab === 'controls' && (
        <>
          {/* Active framework selector */}
          {frameworks.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {frameworks.map(fw => (
                <button
                  key={fw.id}
                  onClick={() => setActiveFw(fw)}
                  className={activeFw?.id === fw.id ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                >
                  {fw.name}
                </button>
              ))}
            </div>
          )}

          {controls.length > 0 ? (
            <div className="surface" style={{ overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">{activeFw?.name ?? 'Controls'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {satisfiedCount} / {controls.length} satisfied
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Framework</th>
                      <th>Control Code</th>
                      <th>Title</th>
                      <th>Evidence Types</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controls.map(c => (
                      <tr key={c.id}>
                        <td>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {activeFw?.name ?? c.framework_id ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {c.control_code}
                          </span>
                        </td>
                        <td>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {c.title}
                          </p>
                          {c.description && (
                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.description}
                            </p>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {c.evidence_types?.join(', ') || (c.evidence?.length ? `${c.evidence.length} item${c.evidence.length !== 1 ? 's' : ''}` : '—')}
                          </span>
                        </td>
                        <td>
                          {c.satisfied
                            ? <span className="badge badge-success">Satisfied</span>
                            : <span className="badge badge-warning">Gap</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No controls mapped</p>
              <p className="empty-state-body">
                {activeFw
                  ? `No controls have been mapped to ${activeFw.name} yet.`
                  : 'Select a framework to view its controls.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Evidence ── */}
      {activeTab === 'evidence' && (
        <>
          {evidence.length > 0 ? (
            <div className="surface" style={{ overflow: 'hidden' }}>
              <div className="panel-header">
                <span className="panel-title">Evidence Items</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {evidence.length} records
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Control</th>
                      <th>Confidence</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((ev, i) => {
                      const confidence = typeof ev.confidence === 'number' ? ev.confidence : null;
                      const confColor = confidence === null
                        ? 'var(--text-muted)'
                        : confidence >= 0.8 ? 'var(--success)'
                        : confidence >= 0.5 ? 'var(--warning)'
                        : 'var(--danger)';
                      const dateStr = ev.date ?? ev.created_at ?? null;
                      return (
                        <tr key={ev.id ?? i}>
                          <td>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                              {ev.tenant ?? '—'}
                            </span>
                          </td>
                          <td>
                            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {ev.control_code ?? ev.control?.control_code ?? '—'}
                            </span>
                          </td>
                          <td>
                            {confidence !== null ? (
                              <span style={{ fontSize: '0.8125rem', color: confColor, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                                {(confidence * 100).toFixed(0)}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No evidence items</p>
              <p className="empty-state-body">
                Evidence is auto-mined from audit ledger events. Run "Auto-Mine Ledger" to populate this view.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
