import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant-e2e';

test.describe('Firewall — /api/v1/firewall/evaluate', () => {
  test('returns 401 without X-Tenant-Id', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/firewall/evaluate`, {
      data: { agent_id: 'test', action: 'read_file', resource: '/etc/passwd' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns a verdict for valid request', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/firewall/evaluate`, {
      headers: { 'X-Tenant-Id': TEST_TENANT_ID, 'Content-Type': 'application/json' },
      data: {
        agent_id: 'e2e-test-agent',
        action: 'read_document',
        resource: 'docs/annual-report.pdf',
        description: 'Reading public document for analysis',
      },
    });
    expect(res.status()).not.toBe(500);
    if (res.status() === 200) {
      const json = await res.json();
      expect(json).toHaveProperty('verdict');
      expect(['allow', 'block', 'escalate']).toContain(json.verdict);
      expect(json).toHaveProperty('risk_score');
      expect(json).toHaveProperty('latency_ms');
    }
  });
});

test.describe('Plugins — /api/v1/plugins', () => {
  test('returns 401 without X-Tenant-Id', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/plugins`);
    expect(res.status()).toBe(401);
  });

  test('returns plugins list and pre-built catalog', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/plugins?include_templates=true`, {
      headers: { 'X-Tenant-Id': TEST_TENANT_ID },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('plugins');
    expect(json).toHaveProperty('templates');
    expect(Array.isArray(json.templates)).toBe(true);
    expect(json.templates.length).toBeGreaterThanOrEqual(5);
  });
});

test.describe('SOUL Templates — /api/v1/soul-templates', () => {
  test('returns catalog without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/soul-templates`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('templates');
    expect(Array.isArray(json.templates)).toBe(true);
  });

  test('returns activation status with tenant header', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/soul-templates`, {
      headers: { 'X-Tenant-Id': TEST_TENANT_ID },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.templates[0]).toHaveProperty('is_activated');
  });
});

test.describe('Agents — /api/v1/agents', () => {
  test('returns 401 without X-Tenant-Id', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/agents`);
    expect(res.status()).toBe(401);
  });

  test('returns agent list for valid tenant', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/agents`, {
      headers: { 'X-Tenant-Id': TEST_TENANT_ID },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('agents');
  });
});

test.describe('HITL Exceptions — /api/v1/exceptions', () => {
  test('returns 401 without X-Tenant-Id', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/exceptions`);
    expect(res.status()).toBe(401);
  });
});

test.describe('Anomalies — /api/v1/anomalies', () => {
  test('returns 401 without X-Tenant-Id', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/anomalies`);
    expect(res.status()).toBe(401);
  });

  test('returns anomaly list for valid tenant', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/anomalies`, {
      headers: { 'X-Tenant-Id': TEST_TENANT_ID },
    });
    expect(res.status()).toBe(200);
  });
});
