/**
 * Role-Based Access Control — Role definitions and permission guards.
 *
 * Roles stored in tenant_memberships.role (Migration D).
 * Until Migration D runs this module defaults all users to 'owner'
 * so existing behaviour is unchanged.
 *
 * CT-2 — Phase: Cross-cutting
 */

import { createAdminClient } from '@lib/db/supabase';

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

export type Role = 'owner' | 'compliance_officer' | 'engineer' | 'auditor';

/** Numeric rank — higher value = more privileges. */
const ROLE_RANK: Record<Role, number> = {
  owner:               4,
  compliance_officer:  3,
  engineer:            2,
  auditor:             1,
};

// ---------------------------------------------------------------------------
// Route permission map
// ---------------------------------------------------------------------------

/**
 * Minimum role required to access a route prefix.
 * Routes not listed are public (no role guard).
 */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; minRole: Role }> = [
  { prefix: '/controls',            minRole: 'compliance_officer' },
  { prefix: '/incidents',           minRole: 'compliance_officer' },
  { prefix: '/compliance/evidence', minRole: 'auditor'            },
  { prefix: '/compliance/reports',  minRole: 'auditor'            },
  { prefix: '/compliance',          minRole: 'auditor'            },
  { prefix: '/audit',               minRole: 'auditor'            },
  { prefix: '/identity',            minRole: 'engineer'           },
  { prefix: '/anomaly',             minRole: 'engineer'           },
  { prefix: '/firewall',            minRole: 'engineer'           },
];

// API route permissions
export const API_ROUTE_PERMISSIONS: Array<{ prefix: string; minRole: Role; methods?: string[] }> = [
  { prefix: '/api/v1/controls',          minRole: 'compliance_officer' },
  { prefix: '/api/v1/incidents',         minRole: 'compliance_officer' },
  { prefix: '/api/v1/compliance',        minRole: 'auditor'            },
  { prefix: '/api/v1/agents',            minRole: 'engineer'           },
  { prefix: '/api/v1/approval-requests', minRole: 'engineer'           },
  { prefix: '/api/v1/metrics',           minRole: 'auditor'            },
];

// ---------------------------------------------------------------------------
// Role display config
// ---------------------------------------------------------------------------

export const ROLE_DISPLAY: Record<Role, { label: string; color: string }> = {
  owner:              { label: 'Owner',              color: 'var(--accent)'  },
  compliance_officer: { label: 'Compliance Officer', color: 'var(--success)' },
  engineer:           { label: 'Engineer',           color: 'var(--info)'    },
  auditor:            { label: 'Auditor',            color: 'var(--warning)' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if `actual` satisfies `required` minimum role. */
export function hasRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/** Find the minimum role required for a route path; null = no restriction. */
export function requiredRoleForPath(path: string): Role | null {
  const entry = ROUTE_PERMISSIONS.find(r => path.startsWith(r.prefix));
  return entry?.minRole ?? null;
}

/** Find minimum role required for an API path; null = no restriction. */
export function requiredRoleForApiPath(path: string): Role | null {
  const entry = API_ROUTE_PERMISSIONS.find(r => path.startsWith(r.prefix));
  return entry?.minRole ?? null;
}

// ---------------------------------------------------------------------------
// Supabase role resolver
// ---------------------------------------------------------------------------

/**
 * Resolves the role for a user within a tenant.
 * Gracefully returns 'owner' if:
 *  - tenant_memberships table does not yet have a role column (Migration D pending)
 *  - user has no membership record
 */
export async function resolveUserRole(
  userId: string,
  tenantId: string,
): Promise<Role> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return 'owner';

    const role = data.role as Role | null;
    if (!role || !ROLE_RANK[role]) return 'owner';

    return role;
  } catch {
    return 'owner';
  }
}
