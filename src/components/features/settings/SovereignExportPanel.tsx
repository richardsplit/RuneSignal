'use client';
import { useState, useEffect } from 'react';

export default function SovereignExportPanel() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [destType, setDestType] = useState('s3');
  const [destUri, setDestUri] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [syncFreq, setSyncFreq] = useState('daily');

  useEffect(() => {
    fetch('/api/v1/sovereign/config')
      .then(r => r.json())
      .then(d => {
        if (d.config) {
            setConfig(d.config);
            setDestType(d.config.destination_type);
            setDestUri(d.config.destination_uri);
            setSyncFreq(d.config.sync_frequency);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        destination_type: destType,
        destination_uri: destUri,
        sync_frequency: syncFreq,
        credentials: {
           accessKeyId: accessKey,
           secretAccessKey: secretKey,
           region: region
        }
    };
    
    const res = await fetch('/api/v1/sovereign/config', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        alert('Configuration saved securely.');
    } else {
        alert('Failed to save configuration.');
    }
  };

  const handleManualSync = async () => {
     const res = await fetch('/api/v1/sovereign/export', { method: 'POST' });
     if (res.ok) {
        const body = await res.json();
        alert(`Successfully synced ${body.records_synced} records to ${config?.destination_uri}`);
     } else {
        alert('Export failed. Check server logs.');
     }
  };

  if (loading) return <div className="text-neutral-400">Loading Configuration...</div>;

  return (
    <div className="bg-neutral-800/40 p-6 rounded-lg border border-neutral-700/50">
      <h3 className="text-xl font-medium text-white mb-2">Sovereign Export Gateway</h3>
      <p className="text-sm text-neutral-400 mb-6">Continuously mirror your cryptographic audit ledger and telemetry logs to an on-permises S3 bucket or Snowflake data warehouse to ensure absolute data sovereignty.</p>

      <form onSubmit={handleSave} className="space-y-4">
         <div>
            <label className="block text-sm text-neutral-300 mb-1">Destination Type</label>
            <select value={destType} onChange={e => setDestType(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none">
               <option value="s3">AWS S3 Blob Storage</option>
               <option value="snowflake">Snowflake Relational Database</option>
            </select>
         </div>

         <div>
             <label className="block text-sm text-neutral-300 mb-1">Destination URI / Bucket ARN</label>
             <input type="text" value={destUri} onChange={e => setDestUri(e.target.value)} placeholder="e.g., s3://trustlayer-secure-us-east/tenant/logs/" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none font-mono text-sm" />
         </div>

         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm text-neutral-300 mb-1">AWS Access Key</label>
                <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder="AKIA..." className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none font-mono text-sm" />
             </div>
             <div>
                <label className="block text-sm text-neutral-300 mb-1">AWS Secret Key</label>
                <input type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="••••••••••••••" className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none font-mono text-sm" />
             </div>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm text-neutral-300 mb-1">AWS Region</label>
               <input type="text" value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none" />
            </div>
            <div>
               <label className="block text-sm text-neutral-300 mb-1">Sync Frequency</label>
               <select value={syncFreq} onChange={e => setSyncFreq(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white outline-none">
                   <option value="hourly">Hourly</option>
                   <option value="daily">Daily Midnight</option>
                   <option value="weekly">Weekly Sunday</option>
               </select>
            </div>
         </div>

         <div className="pt-4 flex gap-4 border-t border-neutral-700/50">
             <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded transition-colors">
                 Save & Encrypt Keys
             </button>
             {config && (
                 <button type="button" onClick={handleManualSync} className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded transition-colors">
                     Trigger Manual Sync
                 </button>
             )}
         </div>
      </form>
    </div>
  );
}
