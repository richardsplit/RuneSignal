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

const adapters: Map<string, IntegrationAdapter> = new Map([
  ['slack', new SlackAdapter()],
  ['servicenow', new ServiceNowAdapter()],
  ['jira', new JiraAdapter()],
  ['pagerduty', new PagerDutyAdapter()],
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
