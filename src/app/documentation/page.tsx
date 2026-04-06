'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Swagger UI is not SSR compatible, we must import it dynamically
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { 
  ssr: false,
  loading: () => <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading API Documentation Engine...</div>
});

export default function DocumentationPage() {
  return (
    <div style={{ padding: '0 2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>API Documentation</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Explore and test the TrustLayer Governance APIs directly from your browser. 
          Use your Developer API Keys for external integration.
        </p>
      </div>

      <div className="glass-panel" style={{ 
        padding: '0.5rem', 
        borderRadius: 'var(--radius-lg)', 
        background: 'rgba(255, 255, 255, 0.95)', // Slightly more opaque for better readability in swagger
        overflow: 'hidden'
      }}>
        <style jsx global>{`
          /* Custom TrustLayer styling for Swagger UI */
          .swagger-ui {
            font-family: inherit !important;
          }
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info { margin: 2rem 0 !important; }
          .swagger-ui .info .title { color: var(--color-text-main) !important; font-size: 1.5rem !important; }
          .swagger-ui .scheme-container { 
            background: transparent !important; 
            box-shadow: none !important; 
            padding: 1rem 0 !important; 
            border-bottom: 1px solid var(--border-glass);
          }
          .swagger-ui .opblock { border-radius: var(--radius-md) !important; }
          .swagger-ui .btn.execute { 
            background-color: var(--color-primary-emerald) !important; 
            border-color: var(--color-primary-emerald) !important; 
          }
          .swagger-ui .btn.authorize {
            border-color: var(--color-primary-emerald) !important;
            color: var(--color-primary-emerald) !important;
          }
          .swagger-ui .btn.authorize svg { fill: var(--color-primary-emerald) !important; }
        `}</style>
        
        <SwaggerUI url="/openapi.yaml" />
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--color-primary-emerald)', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Integration Tip</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
          To authenticate external agents, include the <code>Authorization: Bearer tl_...</code> header in your requests. 
          You can generate and manage these keys in the <a href="/account-settings" style={{ color: 'var(--color-primary-emerald)', fontWeight: 600 }}>API Keys</a> section.
        </p>
      </div>
    </div>
  );
}
