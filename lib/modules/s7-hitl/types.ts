export interface ExceptionTicket {
  id: string;
  tenant_id: string;
  agent_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'approved' | 'rejected' | 'escalated';
  context_data: Record<string, any>;
  assigned_to?: string;
  resolved_by?: string;
  resolution_reason?: string;
  sla_deadline?: string;
  created_at: string;
  resolved_at?: string;
}

export interface CreateExceptionRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  context_data?: Record<string, any>;
}

export interface ResolveExceptionRequest {
  action: 'approve' | 'reject';
  reason: string;
  reviewer_id?: string;
}
