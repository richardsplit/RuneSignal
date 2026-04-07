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

  // Event type → compliance control mappings (deterministic, no LLM needed for core mapping)
  private static readonly EVENT_TO_CONTROLS: Record<string, string[]> = {
    'provenance.certificate':              ['ART-13', 'ART-50', 'MAP-1', 'CC6.1'],
    'agent.registered':                    ['ART-13', 'ART-17', 'MAP-2', 'CC1.1', 'CC6.1'],
    'hitl.exception_created':              ['ART-14', 'MEASURE-1', 'CC7.1'],
    'hitl.exception_resolved':             ['ART-14', 'MANAGE-1', 'CC7.1'],
    'model.version_anomaly_detected':      ['ART-15', 'ART-17', 'MEASURE-1', 'CC7.1'],
    'agent.permission_violation':          ['ART-15', 'MANAGE-1', 'CC6.1'],
    'agent.suspended':                     ['ART-14', 'MANAGE-1', 'CC5.1'],
    'agent.auto_suspended_anomaly':        ['ART-14', 'ART-15', 'CC7.1'],
    'arbiter.decision.block':             ['ART-14', 'ART-15', 'MANAGE-1', 'CC5.1'],
    'moral.conflict':                      ['ART-14', 'GOVERN-1', 'CC1.1'],
    'moral.soul_updated':                  ['ART-17', 'GOVERN-1', 'CC1.1'],
    'insurance.claim.pending_hitl':        ['ART-14', 'CC7.1'],
    'sovereignty.residency_violation':     ['ART-13', 'MAP-1', 'CC6.1'],
    'a2a.handshake.accepted':             ['ART-13', 'MAP-2', 'CC6.1'],
    'a2a.handshake.blocked_by_s1':        ['ART-14', 'MANAGE-1', 'CC5.1'],
    'physical_ai.estop.triggered':         ['ART-14', 'ART-15', 'CC7.1'],
    'finops.budget_exceeded':             ['ART-15', 'CC5.1'],
  };

  /**
   * Scans unmapped audit ledger events and runs them through a deterministic mapping pipeline
   * to automatically associate agent behaviors with specific compliance controls.
   */
  static async autoMineEvidence(tenantId: string): Promise<{ mapped: number; skipped: number }> {
    const supabase = createAdminClient();
    let mapped = 0;
    let skipped = 0;
  
    // Fetch last 500 audit events not yet mapped
    const { data: events } = await supabase
      .from('audit_events')
      .select('id, event_type, created_at, payload')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500);
  
    if (!events || events.length === 0) return { mapped: 0, skipped: 0 };
  
    // Get all available framework controls
    const { data: controls } = await supabase
      .from('framework_controls')
      .select('id, control_code, framework_id');
  
    if (!controls || controls.length === 0) return { mapped: 0, skipped: 0 };
  
    const controlsByCode: Record<string, any> = {};
    for (const c of controls) controlsByCode[c.control_code] = c;
  
    for (const event of events) {
      const targetControlCodes = this.EVENT_TO_CONTROLS[event.event_type] || [];
      if (targetControlCodes.length === 0) { skipped++; continue; }
  
      for (const code of targetControlCodes) {
        const control = controlsByCode[code];
        if (!control) continue;
  
        // Check if this exact evidence already exists (avoid duplicates)
        const { count } = await supabase
          .from('control_evidence')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('control_id', control.id)
          .eq('audit_event_id', event.id);
  
        if ((count || 0) > 0) continue; // Already mapped
  
        const evidenceText = this.generateEvidenceText(event.event_type, event.payload);
  
        await supabase.from('control_evidence').insert({
          tenant_id: tenantId,
          control_id: control.id,
          audit_event_id: event.id,
          evidence_text: evidenceText,
          confidence_score: 0.9
        });
  
        mapped++;
      }
    }
  
    return { mapped, skipped };
  }
  
  private static generateEvidenceText(eventType: string, payload: any): string {
    const descriptions: Record<string, string> = {
      'provenance.certificate': `AI output cryptographically certified. Certificate ID: ${payload?.certificate_id || 'N/A'}. Tamper-evident record satisfies transparency requirements.`,
      'agent.registered': `Agent registered with explicit identity and permission scopes. Demonstrates inventory and accountability.`,
      'hitl.exception_created': `Human oversight triggered. Exception created for human review, ensuring meaningful human oversight of AI decisions.`,
      'hitl.exception_resolved': `Human oversight completed. Exception reviewed and resolved by human reviewer: ${payload?.reviewer || 'reviewer'}.`,
      'model.version_anomaly_detected': `Model version change detected. Demonstrates continuous monitoring for accuracy and robustness.`,
      'agent.permission_violation': `Access control enforced. Agent permission violation detected and blocked.`,
      'arbiter.decision.block': `Conflicting or policy-violating action blocked by automated arbiter.`,
      'moral.conflict': `Corporate ethics policy (SOUL) evaluated. ${payload?.conflict_reason || 'Conflict detected and escalated.'}`,
    };
    return descriptions[eventType] || `Automated governance event '${eventType}' recorded in immutable audit ledger.`;
  }
}
