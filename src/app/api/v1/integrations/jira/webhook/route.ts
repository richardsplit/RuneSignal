import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../../lib/db/supabase';
import { HitlService } from '../../../../../../../lib/modules/s7-hitl/service';

/**
 * POST /api/v1/integrations/jira/webhook
 *
 * Receives Jira webhook events (issue updated, transitioned).
 * When a RuneSignal-linked Jira issue is resolved, approves/rejects the HITL ticket.
 *
 * Configure in Jira: Project Settings → Webhooks → Add Webhook
 * Events: Issue Updated, Issue Transitioned
 * URL: https://your-domain.com/api/v1/integrations/jira/webhook
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType: string = body.webhookEvent || '';

  // Only process issue-updated events
  if (!eventType.includes('issue_updated') && !eventType.includes('jira:issue_updated')) {
    return NextResponse.json({ message: 'Event ignored' });
  }

  const issue = body.issue;
  if (!issue) return NextResponse.json({ message: 'No issue in payload' });

  const statusName: string = issue.fields?.status?.name?.toLowerCase() || '';
  const issueKey: string = issue.key || '';

  // Map Jira status to RuneSignal action
  const approvedStatuses = ['done', 'approved', 'closed', 'resolved'];
  const rejectedStatuses = ['rejected', 'declined', 'cancelled', 'wont do'];

  const isApproved = approvedStatuses.some(s => statusName.includes(s));
  const isRejected = rejectedStatuses.some(s => statusName.includes(s));

  if (!isApproved && !isRejected) {
    return NextResponse.json({ message: `Status "${statusName}" — no action taken` });
  }

  // Find the HITL ticket linked to this Jira issue
  const supabase = createAdminClient();
  const { data: tickets } = await supabase
    .from('hitl_exceptions')
    .select('id, tenant_id, status')
    .eq('status', 'open')
    .filter('external_refs->jira->>issue_key', 'eq', issueKey)
    .limit(1);

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ message: `No open HITL ticket linked to ${issueKey}` });
  }

  const ticket = tickets[0];
  const jiraUser = body.user?.displayName || body.user?.name || 'jira-user';

  try {
    await HitlService.resolveException(ticket.tenant_id, ticket.id, {
      action: isApproved ? 'approve' : 'reject',
      reviewer_id: `jira:${jiraUser}`,
      reason: `${isApproved ? 'Approved' : 'Rejected'} via Jira issue ${issueKey} (status: ${statusName})`,
    });

    return NextResponse.json({
      message: `HITL ticket ${ticket.id} ${isApproved ? 'approved' : 'rejected'} from Jira ${issueKey}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
