'use client';
import { useState } from 'react';
export default function ExplainabilityDashboard() {
  const [certId, setCertId] = useState('');
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;

    setLoading(true);
    setError('');
    setExplanation(null);

    try {
      const res = await fetch(`/api/v1/explain?certificate_id=${certId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch explanation.');
      
      setExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">AI Explainability</h1>
        <p className="page-description">Decode exactly why an autonomous agent made a specific decision using its cryptographic certificate trace.</p>
      </div>

      {/* Search form */}
      <div className="surface" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            className="form-input"
            type="text"
            value={certId}
            onChange={e => setCertId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Evaluating…' : 'Generate Trace'}
          </button>
        </form>
        {error && <div className="callout callout-danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>

      {/* Explanation result */}
      {explanation && (
        <div className="surface" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 300, marginBottom: '0.375rem' }}>Causal Explanation</h2>
              <p className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                Target: {explanation.certificate_id} | Post-Processor: {explanation.model_used}
              </p>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Export ISO 42001 PDF</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p className="t-eyebrow" style={{ marginBottom: '0.625rem' }}>Decision Summary</p>
              <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{explanation.decision_summary}</p>
            </div>

            <div>
              <p className="t-eyebrow" style={{ marginBottom: '0.625rem' }}>Causal Factors</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {explanation.causal_factors?.map((factor: string, i: number) => (
                  <div key={i} className="surface" style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.625rem', background: 'var(--surface-3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    <span className="t-body-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="t-eyebrow" style={{ marginBottom: '0.625rem' }}>Regulatory Adherence Logic</p>
              <div className="surface" style={{ padding: '1rem', background: 'var(--surface-3)', overflow: 'auto' }}>
                <pre className="t-mono" style={{ fontSize: '0.75rem', color: 'var(--info)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(explanation.regulatory_mapping, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
