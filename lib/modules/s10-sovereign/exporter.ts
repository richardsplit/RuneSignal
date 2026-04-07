import { createAdminClient } from '../../db/supabase';
import { SovereignEncryption } from './encryption';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class SovereignExporterService {
  /**
   * Retrieves all events for the tenant since the last sync.
   * Compresses to JSON and pushes to the configured destination.
   */
  static async triggerExport(tenantId: string) {
      const supabase = createAdminClient();
      
      const { data: config } = await supabase.from('sovereign_sync_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();
        
      if (!config) return { success: false, error: 'No active sovereign sync config found.' };

      // Create log entry
      const { data: log, error: logError } = await supabase.from('sovereign_sync_logs').insert({
          tenant_id: tenantId,
          status: 'in_progress'
      }).select().single();

      if (!log || logError) return { success: false, error: 'Failed to create sync log' };

      try {
          // Fetch data to export. E.g. events in the last 24h or since last sync
          const { data: auditEvents } = await supabase.from('audit_events')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(2000);
          const { data: costEvents } = await supabase.from('cost_events')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(2000);
          const { data: moralEvents } = await supabase.from('moral_events')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(2000);

          const exportPayload = JSON.stringify({
             version: '1.0',
             timestamp: new Date().toISOString(),
             tenant_id: tenantId,
             audit_events: auditEvents || [],
             cost_events: costEvents || [],
             moral_events: moralEvents || []
          });

          // Decrypt credentials
          const rawCreds = SovereignEncryption.decrypt(config.credentials_encrypted);
          const creds = JSON.parse(rawCreds);

          if (config.destination_type === 's3') {
             const bucketPath = config.destination_uri.replace('s3://', '');
             const [bucketName, ...restPath] = bucketPath.split('/');
             const keyPrefix = restPath.join('/');
             const fileName = `${keyPrefix ? keyPrefix + '/' : ''}trustlayer_export_${new Date().toISOString().split('T')[0]}.json`;

             const s3Client = new S3Client({
                 region: creds.region || 'us-east-1',
                 credentials: {
                     accessKeyId: creds.accessKeyId,
                     secretAccessKey: creds.secretAccessKey
                 }
             });

             await s3Client.send(new PutObjectCommand({
                 Bucket: bucketName,
                 Key: fileName,
                 Body: exportPayload,
                 ContentType: 'application/json'
             }));
          } else if (config.destination_type === 'snowflake') {
               // Snowflake export mock implementation
               // In production, use snowflake-sdk to stream COPY INTO or stage inserts
               console.log(`[SovereignExporter] S10: Would act on Snowflake dump at ${config.destination_uri}`);
          }

          const recordCount = (auditEvents?.length || 0) + (costEvents?.length || 0) + (moralEvents?.length || 0);

          // Complete log
          await supabase.from('sovereign_sync_logs').update({
              status: 'completed',
              records_synced: recordCount,
              bytes_synced: Buffer.byteLength(exportPayload, 'utf8'),
              completed_at: new Date().toISOString()
          }).eq('id', log.id);

          return { success: true, logId: log.id, records_synced: recordCount };
      } catch (error: any) {
          console.error('[Sovereign Exporter Error]:', error);
          await supabase.from('sovereign_sync_logs').update({
              status: 'failed',
              error_details: error.message,
              completed_at: new Date().toISOString()
          }).eq('id', log.id);

          return { success: false, error: error.message };
      }
  }

  static async runGlobalCron() {
       const supabase = createAdminClient();
       // Trigger sync for all active tenancies 
       const { data: configs } = await supabase.from('sovereign_sync_configs')
         .select('tenant_id')
         .eq('is_active', true);
         
       let count = 0;
       if (configs) {
           for (const conf of configs) {
               // In a production scalable system, push to a pub/sub queue like SQS/Kafka.
               // For this implementation, process sequentially or in bounded Promise.all chunks
               const res = await this.triggerExport(conf.tenant_id);
               if (res?.success) count++;
           }
       }
       return count;
  }
}
