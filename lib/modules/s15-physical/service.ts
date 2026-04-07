import { createAdminClient } from '../../db/supabase';
import { NHIService } from '../s12-nhi/service';
import { AuditLedgerService } from '../../ledger/service';

export interface KineticVector {
  velocity_ms: number;
  lat?: number;
  lon?: number;
}

export class PhysicalAIService {

  /**
   * Extremely fast, deterministic check for kinetic movement. No LLMs are used here
   * to ensure microsecond evaluation for physical hardware endpoints.
   */
  static async validateKineticCommand(nodeId: string, requestedVector: KineticVector) {
    const supabase = createAdminClient();
    
    const { data: policy, error } = await supabase.from('kinetic_policies')
       .select('max_velocity_ms, geofence_center_lat, geofence_center_lon, geofence_radius_m, is_estop_active, hardware_nodes(tenant_id, nhi_agent_id)')
       .eq('node_id', nodeId)
       .single();

    if (error || !policy) {
        return { allowed: false, reason: 'Node or kinetic policy not found. Failsafe default.' };
    }

    if (policy.is_estop_active) {
        return { allowed: false, reason: 'E-STOP_ENGAGED - All kinetic actuation is hard-locked.' };
    }

    if (requestedVector.velocity_ms > (policy.max_velocity_ms || 0)) {
        return { allowed: false, reason: `VELOCITY_VIOLATION - Requested ${requestedVector.velocity_ms}m/s exceeds limit ${policy.max_velocity_ms}m/s.` };
    }

    // Geofencing verification (basic euclidian proxy for speed, Haversine needed in true prod)
    if (requestedVector.lat !== undefined && requestedVector.lon !== undefined && 
        policy.geofence_center_lat !== null && policy.geofence_center_lon !== null && policy.geofence_radius_m !== null) {
        
        const earthRadius = 6371e3; // metres
        const lat1 = policy.geofence_center_lat * Math.PI/180;
        const lat2 = requestedVector.lat * Math.PI/180;
        const deltaLat = (requestedVector.lat - policy.geofence_center_lat) * Math.PI/180;
        const deltaLon = (requestedVector.lon - policy.geofence_center_lon) * Math.PI/180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceMeters = earthRadius * c;

        if (distanceMeters > policy.geofence_radius_m) {
            return { allowed: false, reason: `GEOFENCE_VIOLATION - Requested vector moves node ${distanceMeters}m outside of boundary limit ${policy.geofence_radius_m}m.` };
        }
    }

    return { allowed: true, reason: 'Kinetic vector validated by S15 rules engine.' };
  }

  /**
   * Invokes an immediate hardware kill-switch and optionally crypto-revokes the binding identity.
   */
  static async triggerEStop(tenantId: string, nodeId: string) {
     const supabase = createAdminClient();

     const { data: node } = await supabase.from('hardware_nodes')
       .select('nhi_agent_id, name')
       .eq('id', nodeId)
       .eq('tenant_id', tenantId)
       .single();

     if (!node) throw new Error('Hardware node not found');

     // 1. Engage Physical Database Lock
     await supabase.from('kinetic_policies').update({ is_estop_active: true }).eq('node_id', nodeId);
     await supabase.from('hardware_nodes').update({ status: 'estop_engaged' }).eq('id', nodeId);

     // 2. NHI Key Revocation (Network lock)
     let revoked_cert = null;
     if (node.nhi_agent_id) {
         try {
            // Find active key mapping to this agent ID (this assumes mapping structure from S12)
            const { data: keyData } = await supabase.from('api_keys').select('id').eq('agent_id', node.nhi_agent_id).eq('is_active', true).limit(1).single();
            if (keyData) {
                const res = await NHIService.revokeIdentity(tenantId, keyData.id, `PHYSICAL_ESTOP Triggered for node ${node.name}`);
                revoked_cert = res.certificate_id;
            }
         } catch (e) {
            console.error('Failed to revoke cryptokey on E-Stop jump:', e);
         }
     }

     // 3. Immutability Ledger Audit
     await AuditLedgerService.appendEvent({
        event_type: 'physical_ai.estop.triggered',
        module: 's15',
        tenant_id: tenantId,
        agent_id: node.nhi_agent_id || 'system_override',
        payload: {
           node_id: nodeId,
           node_name: node.name,
           revocation_cert: revoked_cert
        }
     });

     return { success: true, message: 'CRITICAL E-STOP ENGAGED. All kinetic vectors locked.', killed_cert: revoked_cert };
  }

  static async listNodes(tenantId: string) {
      const supabase = createAdminClient();
      const { data } = await supabase.from('hardware_nodes').select(`
          id, name, device_type, status, nhi_agent_id,
          kinetic_policies(max_velocity_ms, geofence_radius_m, is_estop_active)
      `).eq('tenant_id', tenantId).order('created_at', { ascending: false });
      return data || [];
  }
}
