import { createAdminClient } from '../../db/supabase';
import { AuditLedgerService } from '../../ledger/service';
import { WebhookEmitter } from '../../webhooks/emitter';

export class VersionMonitor {
  /**
   * Extracts a structural fingerprint from response characteristics.
   * Uses sentence count, avg word length, markdown presence, paragraph count.
   * Stable across minor response variations, changes when model behaviour shifts.
   */
  static extractFingerprint(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3).length;
    const words = text.split(/\s+/).filter(Boolean);
    const avgWordLen = words.length > 0
      ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1)
      : '0.0';
    const punctDensity = ((text.match(/[,;:()[\]{}]/g) || []).length / Math.max(words.length, 1)).toFixed(2);
    const hasMarkdown = /```|\*\*|#{1,3} |\[.+\]\(/.test(text) ? '1' : '0';
    const paraCount = text.split(/\n\n+/).length;
    return `fp_s${sentences}_w${avgWordLen}_p${punctDensity}_md${hasMarkdown}_par${paraCount}`;
  }

  /**
   * Compares the current response fingerprint to the stored baseline.
   * On first call for a provider+model, stores the baseline (no alert).
   * On subsequent calls, alerts if fingerprint changes after 10+ samples.
   */
  static async analyzeAndDetect(
    tenantId: string,
    modelVersion: string,
    completionText: string,
    provider: string,
    model?: string
  ): Promise<void> {
    const supabase = createAdminClient();
    const resolvedModel = model || modelVersion;
    const fingerprint = this.extractFingerprint(completionText);

    const { data: existing } = await supabase
      .from('model_version_fingerprints')
      .select('fingerprint, sample_count')
      .eq('tenant_id', tenantId)
      .eq('provider', provider)
      .eq('model', resolvedModel)
      .single();

    if (!existing) {
      // First time seeing this model — store baseline, no alert
      await supabase.from('model_version_fingerprints').insert({
        tenant_id: tenantId,
        provider,
        model: resolvedModel,
        fingerprint,
        sample_count: 1
      });
      return;
    }

    // Update last_seen and increment sample count
    await supabase.from('model_version_fingerprints').update({
      last_seen_at: new Date().toISOString(),
      sample_count: existing.sample_count + 1
    }).eq('tenant_id', tenantId).eq('provider', provider).eq('model', resolvedModel);

    // Only alert after 10+ samples to avoid noise during baseline establishment
    if (existing.fingerprint !== fingerprint && existing.sample_count >= 10) {
      const eventDetails = {
        model_version: modelVersion,
        provider,
        model: resolvedModel,
        detected_fingerprint: fingerprint,
        previous_fingerprint: existing.fingerprint,
        tenant_id: tenantId,
        sample_count: existing.sample_count
      };

      await AuditLedgerService.appendEvent({
        event_type: 'model.version_anomaly_detected',
        module: 's3',
        tenant_id: tenantId,
        request_id: `monitor-${Date.now()}`,
        payload: eventDetails
      });

      await WebhookEmitter.notifyTenant(
        tenantId,
        `⚠️ Model fingerprint changed: ${provider}/${resolvedModel} — possible silent update after ${existing.sample_count} samples`,
        eventDetails
      );

      // Update baseline to new fingerprint, reset sample count
      await supabase.from('model_version_fingerprints').update({
        fingerprint,
        sample_count: 1
      }).eq('tenant_id', tenantId).eq('provider', provider).eq('model', resolvedModel);
    }
  }
}
