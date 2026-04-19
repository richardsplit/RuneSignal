/**
 * GET /api/v1/auth/me
 *
 * Returns the authenticated user's profile and their role within the current tenant.
 * Role resolves from tenant_memberships.role (Migration D). Until that migration
 * runs, falls back to 'owner' so no behaviour changes.
 *
 * CT-2 — RBAC Phase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@lib/db/supabase';
import { resolveUserRole, ROLE_DISPLAY } from '@lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');

    const supabase = await createServerClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = tenantId
      ? await resolveUserRole(user.id, tenantId)
      : 'owner';

    const display = ROLE_DISPLAY[role];

    return NextResponse.json({
      id:         user.id,
      email:      user.email ?? null,
      name:       user.user_metadata?.full_name ?? user.email ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role,
      role_label: display.label,
      role_color: display.color,
      tenant_id:  tenantId ?? null,
    });
  } catch (err) {
    console.error('[auth/me] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
