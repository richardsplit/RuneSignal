'use client';

import React from 'react';
import {
  IconDashboard, IconFirewall,
  IconProvenance, IconConflict, IconIncidents, IconExceptions, IconAudit,
  IconExplainability, IconGovernanceIntel, IconComplianceReports, IconAnomaly, IconControls,
  IconIdentity, IconNHI, IconFinOps, IconDataResidency,
  IconA2A,
  IconIntegrations, IconBilling, IconSettings,
  IconEvidencePack, IconLedger, IconRegistry, IconInsurance,
} from './icons';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
      { label: 'Firewall', href: '/firewall', icon: <IconFirewall /> },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Provenance', href: '/provenance', icon: <IconProvenance /> },
      { label: 'Conflict Arbiter', href: '/conflict', icon: <IconConflict /> },
      { label: 'Incidents', href: '/incidents', icon: <IconIncidents /> },
      { label: 'Review Queue', href: '/exceptions', icon: <IconExceptions /> },
      { label: 'Audit Trail', href: '/audit', icon: <IconAudit /> },
    ],
  },
  {
    label: 'Evidence Plane',
    items: [
      { label: 'Evidence Packs', href: '/evidence', icon: <IconEvidencePack /> },
      { label: 'Decision Ledger', href: '/ledger', icon: <IconLedger /> },
      { label: 'Agent Registry', href: '/registry', icon: <IconRegistry /> },
      { label: 'Insurance Export', href: '/insurance', icon: <IconInsurance /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Explainability', href: '/explain', icon: <IconExplainability /> },
      { label: 'Governance Intel', href: '/compliance', icon: <IconGovernanceIntel /> },
      { label: 'Compliance Reports', href: '/compliance/reports', icon: <IconComplianceReports /> },
      { label: 'Evidence Wizard', href: '/compliance/evidence', icon: <IconProvenance /> },
      { label: 'Controls', href: '/controls', icon: <IconControls /> },
      { label: 'Anomaly Detection', href: '/anomaly', icon: <IconAnomaly /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Agent Identity', href: '/identity', icon: <IconIdentity /> },
      { label: 'NHI Lifecycle', href: '/nhi', icon: <IconNHI /> },
      { label: 'FinOps', href: '/finops', icon: <IconFinOps /> },
      { label: 'Data Residency', href: '/sovereignty', icon: <IconDataResidency /> },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { label: 'A2A Gateway', href: '/a2a', icon: <IconA2A /> },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', href: '/account-settings/integrations', icon: <IconIntegrations /> },
      { label: 'Billing', href: '/billing', icon: <IconBilling /> },
      { label: 'Settings', href: '/account-settings/sso', icon: <IconSettings /> },
    ],
  },
];
