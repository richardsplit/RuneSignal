import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/db/supabase';
import { HitlService } from '../../../../../../../lib/modules/s7-hitl/service';

/**
 * POST /api/v1/integrations/slack/callback
 *
 * Receives Slack interactive component payloads (button clicks).
 * Verifies the Slack request signature, then approves/rejects the linked HITL ticket.
 *
 * Slack sends: Content-Type: application/x-www-form-urlencoded
 * with a `payload` field containing JSON.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Slack signature
  const slackSignature = request.headers.get('X-Slack-Signature');
  const slackTimestamp = request.headers.get('X-Slack-Request-Timestamp');

  if (slackSignature && slackTimestamp) {
    const isValid = await verifySlackSignature(rawBody, slackTimestamp, slackSignature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 });
    }
  }

  // Parse the payload (URL-encoded form with JSON payload field)
  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload');
  if (!payloadRaw) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return NextResponse.json({ error: 'Invalid payload JSON' }, { status: 400 });
  }

  // Extract the action
  const action = payload.actions?.[0];
  if (!action) return NextResponse.json({ message: 'No action found' });

  const actionId: string = action.action_id || '';
  const ticketId = action.value;
  const slackUserId: string = payload.user?.id || 'slack-user';
  const slackUserName: string = payload.user?.name || slackUserId;

  // Determine approve vs reject from action_id
  const isApprove = actionId.startsWith('hitl_approve_');
  const isReject = actionId.startsWith('hitl_reject_');

  if (!isApprove && !isReject) {
    return NextResponse.json({ message: 'Unknown action' });
  }

  if (!ticketId) {
    return NextResponse.json({ error: 'Missing ticket ID in action value' }, { status: 400 });
  }

  // Look up the ticket to get tenant_id
  const supabase = createAdminClient();
  const { data: ticket, error } = await supabase
    .from('hitl_exceptions')
    .select('tenant_id, status')
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  if (ticket.status !== 'open') {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `⚠️ This ticket has already been ${ticket.status}.`,
    });
  }

  try {
    await HitlService.resolveException(ticket.tenant_id, ticketId, {
      action: isApprove ? 'approve' : 'reject',
      reviewer_id: `slack:${slackUserName}`,
      reason: `${isApprove ? 'Approved' : 'Rejected'} via Slack by ${slackUserName}`,
    });

    // Respond to Slack with an ephemeral confirmation
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `${isApprove ? '✅ Approved' : '❌ Rejected'} by ${slackUserName}. RuneSignal audit ledger updated.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Verifies Slack's HMAC-SHA256 request signature.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 60 * 5) return false;

  // Find the signing secret from integration_channels config
  // For now we use the SLACK_SIGNING_SECRET env var as a fallback
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return true; // Skip verification if not configured

  const baseString = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  const computed = 'v0=' + Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === signature;
}
