/**
 * Blast Radius Scorer
 *
 * Computes a risk tier for any agent action based on configurable factors.
 * Higher blast radius → automatic HITL routing.
 */

export interface BlastRadiusInput {
  action_type: string;
  payload_size_bytes?: number;
  affects_external_systems: boolean;
  reversible: boolean;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
  affected_record_count?: number;
}

export type BlastRadius = 'low' | 'medium' | 'high' | 'critical';

export interface BlastRadiusResult {
  level: BlastRadius;
  score: number; // 0–100
  factors: string[];
}

// Default thresholds — can be overridden per-org via org_settings
const DEFAULT_THRESHOLDS = {
  critical: 75,
  high: 50,
  medium: 25,
};

const DATA_CLASSIFICATION_SCORES: Record<string, number> = {
  public: 0,
  internal: 10,
  confidential: 25,
  restricted: 40,
};

const HIGH_RISK_ACTION_PATTERNS = [
  'delete', 'drop', 'truncate', 'remove', 'purge',
  'send_email', 'send_message', 'post', 'publish',
  'transfer', 'payment', 'charge', 'invoice',
  'deploy', 'rollback', 'migrate',
  'grant', 'revoke', 'admin',
];

export function computeBlastRadius(
  input: BlastRadiusInput,
  thresholds: typeof DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS
): BlastRadiusResult {
  let score = 0;
  const factors: string[] = [];

  // Non-reversible actions carry more risk
  if (!input.reversible) {
    score += 20;
    factors.push('irreversible action (+20)');
  }

  // External system impact
  if (input.affects_external_systems) {
    score += 20;
    factors.push('affects external systems (+20)');
  }

  // Data classification
  const classScore = DATA_CLASSIFICATION_SCORES[input.data_classification] || 0;
  if (classScore > 0) {
    score += classScore;
    factors.push(`data classification: ${input.data_classification} (+${classScore})`);
  }

  // Record count impact
  if (input.affected_record_count !== undefined) {
    if (input.affected_record_count > 10000) {
      score += 20;
      factors.push('affects >10k records (+20)');
    } else if (input.affected_record_count > 1000) {
      score += 10;
      factors.push('affects >1k records (+10)');
    } else if (input.affected_record_count > 100) {
      score += 5;
      factors.push('affects >100 records (+5)');
    }
  }

  // Action type patterns
  const actionLower = input.action_type.toLowerCase();
  const matchedPattern = HIGH_RISK_ACTION_PATTERNS.find(p => actionLower.includes(p));
  if (matchedPattern) {
    score += 15;
    factors.push(`high-risk action pattern: ${matchedPattern} (+15)`);
  }

  // Payload size impact
  if (input.payload_size_bytes !== undefined && input.payload_size_bytes > 1_000_000) {
    score += 5;
    factors.push('large payload >1MB (+5)');
  }

  // Clamp to 100
  score = Math.min(100, score);

  let level: BlastRadius;
  if (score >= thresholds.critical) {
    level = 'critical';
  } else if (score >= thresholds.high) {
    level = 'high';
  } else if (score >= thresholds.medium) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { level, score, factors };
}

/** Convenience: compute blast radius from a simple action_type string */
export function inferBlastRadius(action_type: string, reversible = true): BlastRadius {
  return computeBlastRadius({
    action_type,
    affects_external_systems: false,
    reversible,
    data_classification: 'internal',
  }).level;
}
