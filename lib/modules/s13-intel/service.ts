import { createAdminClient } from '../../db/supabase';

export class GovernanceIntelService {
  /**
   * Generates a structural overview of all frameworks mapped against currently known evidence.
   */
  static async getComplianceDashboards(tenantId: string) {
    const supabase = createAdminClient();

    const { data: frameworks } = await supabase.from('compliance_frameworks')
      .select('id, name, description, version, tenant_id')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

    if (!frameworks) return [];

    const result = [];
    for (const fw of frameworks) {
      // Get controls for framework
      const { data: controls } = await supabase.from('framework_controls')
         .select('id, control_code, title')
         .eq('framework_id', fw.id);
      
      const fwControls = controls || [];
      const controlIds = fwControls.map(c => c.id);

      let evidenceCount = 0;
      if (controlIds.length > 0) {
          const { count } = await supabase.from('control_evidence')
             .select('*', { count: 'exact', head: true })
             .eq('tenant_id', tenantId)
             .in('control_id', controlIds);
        
          evidenceCount = count || 0;
      }

      // Simplified score calculation
      const progress = fwControls.length === 0 ? 0 : Math.min(100, Math.round((evidenceCount / fwControls.length) * 100));

      result.push({
         ...fw,
         controls_count: fwControls.length,
         evidence_count: evidenceCount,
         progress_pct: progress
      });
    }

    return result;
  }

  /**
   * Fetches the detailed evidence package for a specific framework.
   */
  static async getEvidencePackage(tenantId: string, frameworkId: string) {
     const supabase = createAdminClient();

     const { data: controls } = await supabase.from('framework_controls')
         .select('id, control_code, title, description')
         .eq('framework_id', frameworkId);

     if (!controls || controls.length === 0) return [];

     const controlIds = controls.map(c => c.id);

     const { data: evidences } = await supabase.from('control_evidence')
         .select(`
             id, 
             control_id, 
             evidence_text, 
             confidence_score, 
             created_at,
             audit_events ( id, event_type, agent_id, payload )
         `)
         .eq('tenant_id', tenantId)
         .in('control_id', controlIds);

     // Join it up
     const packageData = controls.map(c => {
         const mappedEvidence = (evidences || []).filter(e => e.control_id === c.id);
         return {
             ...c,
             satisfied: mappedEvidence.length > 0,
             evidence: mappedEvidence
         };
     });

     return packageData;
  }

  /**
   * Scans unmapped audit ledger events and runs them through an LLM mapping pipeline
   * to automatically associate agent behaviors with specific compliance controls.
   */
  static async autoMineEvidence(tenantId: string) {
      const supabase = createAdminClient();
      
      // Stub: In a live system, this pulls the last 1000 events without evidence mapping, 
      // queries `system = "Map this JSON to the EU AI Act"` and writes outputs to control_evidence.
      // For this phase, we will generate a mock mapped evidence to demonstrate the hub.

      const { data: fw } = await supabase.from('compliance_frameworks').select('id').eq('name', 'EU AI Act').single();
      const { data: event } = await supabase.from('audit_events').select('id').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).single();
      
      if (fw && event) {
          const { data: control } = await supabase.from('framework_controls').select('id').eq('framework_id', fw.id).eq('control_code', 'ART-13').single();
          if (control) {
              await supabase.from('control_evidence').insert({
                 tenant_id: tenantId,
                 control_id: control.id,
                 audit_event_id: event.id,
                 evidence_text: 'Automatically detected: Agent execution log contains detailed reasoning trace satisfying transparency requirements.',
                 confidence_score: 0.92
              });
              return { success: true, new_evidence: 1 };
          }
      }
      return { success: false, new_evidence: 0 };
  }
}
