'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Swagger UI is not SSR compatible, we must import it dynamically
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem' }}><p className="t-body-sm text-tertiary">Loading API Documentation Engine…</p></div>
});

export default function DocumentationPage() {
  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">API Documentation</h1>
        <p className="page-description">
          Explore and test the RuneSignal Governance APIs directly from your browser.
          Use your Developer API Keys for external integration.
        </p>
      </div>

      <div className="surface" style={{ padding: '0.5rem', overflow: 'hidden' }}>
        <style jsx global>{`
          .swagger-ui { font-family: inherit !important; }
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info { margin: 2rem 0 !important; }
          .swagger-ui .info .title { color: var(--text-primary) !important; font-size: 1.5rem !important; }
          .swagger-ui .scheme-container {
            background: transparent !important;
            box-shadow: none !important;
            padding: 1rem 0 !important;
            border-bottom: 1px solid var(--border-default);
          }
          .swagger-ui .opblock { border-radius: var(--radius-md) !important; }
          .swagger-ui .btn.execute {
            background-color: var(--accent) !important;
            border-color: var(--accent) !important;
          }
          .swagger-ui .btn.authorize {
            border-color: var(--accent) !important;
            color: var(--accent) !important;
          }
          .swagger-ui .btn.authorize svg { fill: var(--accent) !important; }
        `}</style>
        <SwaggerUI url="/openapi.yaml" />
      </div>

      <div className="callout callout-info" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>Integration Tip</h3>
        <p className="t-body-sm">
          Include the <code>Authorization: Bearer tl_…</code> header in your requests.
          Generate keys in the{' '}
          <a href="/account-settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>API Keys</a> section.
        </p>
      </div>
    </div>
  );
}
