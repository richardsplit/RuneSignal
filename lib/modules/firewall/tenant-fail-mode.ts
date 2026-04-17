/**
 * Resolves the tenant-level fail_mode setting.
 * Used by FirewallService and McpEnforcementProxy to determine behaviour
 * when a governance check errors out.
 *
 *   'open'   → errors are treated as pass (default, backwards-compatible)
 *   'closed' → errors are treated as fail (recommended for high-risk deployments)
 */
import { createAdminClient } from '../../db/supabase';

export type FailMode = 'open' | 'closed';

const DEFAULT_FAIL_MODE: FailMode = 'open';

export async function getTenantFailMode(tenantId: string): Promise<FailMode> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('tenants')
      .select('fail_mode')
      .eq('id', tenantId)
      .single();

    if (data?.fail_mode === 'open' || data?.fail_mode === 'closed') {
      return data.fail_mode;
    }
  } catch {
    // If we can't read the setting, fall back to the safe default.
  }
  return DEFAULT_FAIL_MODE;
}
