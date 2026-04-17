/**
 * IntegrationRegistry
 *
 * Central registry of all available integration adapters.
 * Add new adapters here to make them available in the system.
 */

import type { IntegrationAdapter } from './IntegrationAdapter.interface';
import { SlackAdapter } from './slack';
import { ServiceNowAdapter } from './servicenow';
import { JiraAdapter } from './jira';
import { PagerDutyAdapter } from './pagerduty';
import { TeamsAdapter } from './teams';
import { WebhookAdapter } from './webhook';

const adapters = new Map<string, IntegrationAdapter>([
  ['slack', new SlackAdapter()],
  ['servicenow', new ServiceNowAdapter()],
  ['jira', new JiraAdapter()],
  ['pagerduty', new PagerDutyAdapter()],
  ['teams', new TeamsAdapter()],
  ['webhook', new WebhookAdapter()],
]);

export const IntegrationRegistry = {
  get(provider: string): IntegrationAdapter | undefined {
    return adapters.get(provider.toLowerCase());
  },

  getAll(): IntegrationAdapter[] {
    return Array.from(adapters.values());
  },

  getProviders(): string[] {
    return Array.from(adapters.keys());
  },

  register(adapter: IntegrationAdapter): void {
    adapters.set(adapter.provider.toLowerCase(), adapter);
  },
};
