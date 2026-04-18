'use client';
import { useState, useEffect } from 'react';

interface KineticPolicy {
    max_velocity_ms: number;
    geofence_radius_m: number;
    is_estop_active: boolean;
}

interface HardwareNode {
    id: string;
    name: string;
    device_type: string;
    status: string;
    nhi_agent_id: string;
    kinetic_policies: KineticPolicy[];
}

export default function PhysicalAIDashboard() {
  const [nodes, setNodes] = useState<HardwareNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = async () => {
    try {
        const res = await fetch('/api/v1/physical/nodes');
        const data = await res.json();
        setNodes(data.nodes || []);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    // Poll for hardware status every 5 seconds
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerEStop = async (nodeId: string) => {
     if (!confirm('WARNING: THIS WILL ENGAGE A PHYSICAL KILL-SWITCH. THE HARDWARE WILL HARD-LOCK. Proceed?')) return;
     
     const res = await fetch('/api/v1/physical/estop', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ node_id: nodeId })
     });
     
     if (res.ok) {
         alert('CRITICAL E-STOP ENGAGED. Physical node is locked.');
         fetchNodes();
     } else {
         alert('Failed to transmit E-Stop signal.');
     }
  };

  const getEstopStatus = (n: HardwareNode) => {
      const ext = n.kinetic_policies && n.kinetic_policies.length > 0 ? n.kinetic_policies[0].is_estop_active : false;
      return n.status === 'estop_engaged' || ext;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="t-body-sm text-tertiary">Connecting to physical telemetry feeds…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Physical AI Overrides</h1>
        <p className="page-description">
          Deterministic kinetic safety blocks and zero-latency emergency stop controls for robotics and IoT agents.
        </p>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.75rem' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Nodes</div>
          <div className="kpi-value">{nodes.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">E-Stop Active</div>
          <div className="kpi-value" style={{ color: nodes.filter(n => getEstopStatus(n)).length > 0 ? 'var(--danger)' : undefined }}>
            {nodes.filter(n => getEstopStatus(n)).length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Live Nodes</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {nodes.filter(n => !getEstopStatus(n)).length}
          </div>
        </div>
      </div>

      {/* Node cards grid */}
      {nodes.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No hardware nodes registered</p>
          <p className="empty-state-body">No hardware nodes registered to this tenant.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {nodes.map(node => {
            const estopEngaged = getEstopStatus(node);
            const kp = node.kinetic_policies?.[0];
            return (
              <div
                key={node.id}
                className="surface"
                style={{
                  padding: '1.25rem',
                  border: `1px solid ${estopEngaged ? 'var(--danger-border)' : 'var(--border-default)'}`,
                  background: estopEngaged ? 'var(--danger-soft)' : undefined,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{node.name}</span>
                    {estopEngaged
                      ? <span className="badge badge-danger" style={{ animation: 'skeletonPulse 1.4s ease-in-out infinite' }}>LOCKED</span>
                      : <span className="badge badge-success">LIVE</span>
                    }
                  </div>
                  <div className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>ID: {node.id.split('-')[0]}…</div>
                  <div className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.125rem', textTransform: 'capitalize' }}>{node.device_type}</div>
                </div>

                <div className="surface" style={{ padding: '0.625rem 0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', background: 'var(--surface-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="t-caption">Max Velocity:</span>
                    <span className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--success)' }}>{kp?.max_velocity_ms || 0} m/s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="t-caption">Geofence:</span>
                    <span className="t-mono" style={{ fontSize: '0.6875rem', color: 'var(--info)' }}>{kp?.geofence_radius_m || 'Unbounded'}m</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="t-caption">NHI Link:</span>
                    <span className="t-mono" style={{ fontSize: '0.6875rem', color: node.nhi_agent_id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {node.nhi_agent_id ? `${node.nhi_agent_id.split('-')[0]}…` : 'None'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => triggerEStop(node.id)}
                  disabled={estopEngaged}
                  className={estopEngaged ? 'btn btn-ghost' : 'btn btn-danger'}
                  style={{ width: '100%', fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.8125rem' }}
                >
                  {estopEngaged ? 'E-STOP HARDLOCKED' : 'ENGAGE KINETIC E-STOP'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
