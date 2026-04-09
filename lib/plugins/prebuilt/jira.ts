/**
 * Pre-built Jira Plugin
 *
 * Trigger: hitl.exception_created
 * Action: POST to Jira REST API to create an issue in the configured project.
 *         Stores the Jira issue key in the HITL exception record for bi-directional sync.
 *
 * Installation: Tenant configures endpoint_url = https://<domain>.atlassian.net/rest/api/3/issue
 * auth_header = Authorization: Basic <base64(email:api_token)>
 */

export const JIRA_PLUGIN_TEMPLATE = {
  name: 'Jira — HITL Ticket Sync',
  description:
    'Creates a Jira issue every time a Human-in-the-Loop (HITL) exception is raised. Keeps the Jira summary and status in sync with the TrustLayer exception.',
  plugin_type: 'webhook',
  category: 'ticketing',
  icon: '🎯',
  triggers: ['hitl.exception_created', 'hitl.exception_resolved'],
  retry_count: 3,
  timeout_ms: 8000,
  // endpoint_url and auth_header must be filled in by the tenant on installation
};

/**
 * Formats a TrustLayer audit event into a Jira issue creation body.
 * Called by the plugin executor before posting to the tenant's Jira endpoint.
 */
export function buildJiraIssueBody(event: {
  event_type: string;
  payload: Record<string, any>;
}): Record<string, any> {
  const p = event.payload;
  const isCreate = event.event_type === 'hitl.exception_created';

  return {
    fields: {
      summary: isCreate
        ? `[TrustLayer HITL] ${p.title || 'Agent action requires review'}`
        : `[TrustLayer HITL Resolved] ${p.title || 'Exception resolved'}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: p.description || 'No description provided.' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Agent: ${p.agent_id || 'unknown'} | Priority: ${p.priority || 'medium'} | Exception ID: ${p.exception_id || ''}`,
              },
            ],
          },
        ],
      },
      issuetype: { name: isCreate ? 'Task' : 'Task' },
      priority: { name: p.priority === 'critical' ? 'Highest' : p.priority === 'high' ? 'High' : 'Medium' },
      labels: ['trustlayer', 'hitl', `agent-governance`],
    },
  };
}
