/**
 * Agent Registry Export — JSON / CSV download.
 *
 * GET /api/v1/agents/export?format=json|csv
 *
 * Merges agent_inventory and agent_credentials for a complete registry.
 * EU AI Act Article 13 — Transparency & Traceability
 * Phase 5 Task 5.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase';

interface ExportRow {
  agent_id: string;
  name: string;
  type: string;
  framework: string;
  status: string;
  risk_classification: string;
  eu_ai_act_category: string;
  last_active: string;
  registered_at: string;
  owner: string;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { error: 'Invalid format. Must be "json" or "csv".' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Fetch from agent_inventory (primary registry)
    const { data: inventory, error: invError } = await supabase
      .from('agent_inventory')
      .select('*')
      .eq('org_id', tenantId)
      .order('first_seen_at', { ascending: false });

    if (invError) {
      throw invError;
    }

    // Fetch from agent_credentials to merge supplementary data
    const { data: credentials } = await supabase
      .from('agent_credentials')
      .select('id, agent_name, agent_type, framework, status, last_seen_at, created_at, metadata')
      .eq('tenant_id', tenantId);

    // Index credentials by name for loose matching
    const credMap = new Map<string, Record<string, unknown>>();
    for (const cred of credentials || []) {
      credMap.set(cred.id, cred as Record<string, unknown>);
    }

    // Build export rows from inventory, enriching with credential data where available
    const rows: ExportRow[] = (inventory || []).map((inv: Record<string, unknown>) => {
      const meta = (inv.metadata as Record<string, unknown>) || {};
      return {
        agent_id: String(inv.id || ''),
        name: String(inv.name || ''),
        type: String(inv.framework || 'unknown'),
        framework: String(inv.framework || 'unknown'),
        status: String(inv.status || 'active'),
        risk_classification: String(inv.risk_classification || 'unclassified'),
        eu_ai_act_category: String(inv.eu_ai_act_category || 'unclassified'),
        last_active: String(inv.last_active_at || ''),
        registered_at: String(inv.first_seen_at || ''),
        owner: String(inv.owner_user_id || meta.owner || ''),
      };
    });

    // Append credentials-only agents not in inventory
    const inventoryIds = new Set(rows.map((r) => r.agent_id));
    for (const cred of credentials || []) {
      if (!inventoryIds.has(cred.id)) {
        rows.push({
          agent_id: cred.id,
          name: cred.agent_name,
          type: cred.agent_type,
          framework: cred.framework || 'unknown',
          status: cred.status,
          risk_classification: 'unclassified',
          eu_ai_act_category: 'unclassified',
          last_active: String(cred.last_seen_at || ''),
          registered_at: String(cred.created_at || ''),
          owner: '',
        });
      }
    }

    if (format === 'csv') {
      const headers: (keyof ExportRow)[] = [
        'agent_id',
        'name',
        'type',
        'framework',
        'status',
        'risk_classification',
        'eu_ai_act_category',
        'last_active',
        'registered_at',
        'owner',
      ];
      const csvRows = [headers.join(',')];
      for (const row of rows) {
        csvRows.push(
          headers
            .map((h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`)
            .join(','),
        );
      }
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="agent-registry-export.csv"',
        },
      });
    }

    // Default: JSON
    return NextResponse.json({ agents: rows, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
