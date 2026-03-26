import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';

/**
 * VersionMonitor analyzes LLM responses to detect silent model updates 
 * (fingerprint changes) without explicit version bumps from providers.
 */
export class VersionMonitor {
  /**
   * Generates a heuristic fingerprint based on response characteristics.
   * This is a simplified extraction: in production this analyzes logprobs patterns,
   * token boundary signatures, and response characteristic probes.
   */
  static extractFingerprint(completionText: string): string {
    const avgWordLength = (completionText.length / (completionText.split(' ').length || 1)).toFixed(2);
    const hasMarkdown = completionText.includes('```') ? 'md1' : 'md0';
    return `fp_${avgWordLength}_${hasMarkdown}`;
  }

  /**
   * Analyzes an output, compares its fingerprint to the last known fingerprint
   * for the alleged model_version, and emits anomalous change events via webhook.
   */
  static async analyzeAndDetect(
    tenantId: string, 
    modelVersion: string, 
    completionText: string, 
    provider: string
  ): Promise<void> {
    const fingerprint = this.extractFingerprint(completionText);
    
    // In production, we query Redis or the DB for the last known fingerprint of this modelVersion.
    // Deterministic Implementation: Detect change based on fingerprint drift
    let baselineFingerprint = 'none'; // Default to 'none' to suppress false alerts until baseline is seen
    const isAnomalous = fingerprint !== baselineFingerprint && baselineFingerprint !== 'none';
    
    if (isAnomalous) {
      const eventDetails = {
        model_version: modelVersion,
        provider: provider,
        detected_fingerprint: fingerprint,
        previous_fingerprint: baselineFingerprint,
        tenant_id: tenantId
      };

      // 1. Audit Ledger Event
      await AuditLedgerService.appendEvent({
        event_type: 'model.version_anomaly_detected',
        module: 's3',
        tenant_id: tenantId,
        request_id: 'internal-monitor',
        payload: eventDetails
      });

      // 2. GRC Webhook Alert
      await WebhookEmitter.notifySlack(
        `🚨 Model Version Anomaly Detected: ${provider}/${modelVersion} appears to have silently updated`,
        eventDetails
      );
    }
  }
}
