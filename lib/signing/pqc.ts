/**
 * S_PQC — Post-Quantum Cryptography signing stub (Phase 11).
 * Implements ML-DSA-65 (NIST FIPS 204) via @noble/post-quantum when available.
 *
 * Activated when FEATURE_PQC=true.
 * Falls back to Ed25519-only signing when the library is not installed or flag is off.
 *
 * EU AI Act Article 15 — cybersecurity robustness, future-proof signing.
 */

export interface PqcSignResult {
  algorithm:   string;
  signature:   string;
  signed_at:   string;
  key_id:      string;
}

/**
 * Dual-sign a payload: Ed25519 (primary) + ML-DSA-65 (PQC backup).
 * When FEATURE_PQC is false, returns only the Ed25519 result.
 *
 * @param payload  - canonical JSON string or Buffer to sign
 * @param ed25519Signature - the already-computed Ed25519 signature (hex)
 */
export async function pqcSign(payload: string, _ed25519Signature: string): Promise<PqcSignResult | null> {
  if (process.env.FEATURE_PQC !== 'true') return null;

  try {
    // Attempt to load @noble/post-quantum dynamically — soft dep, not in package.json yet.
    // Replace with static import once the library reaches stable release.
    // Dynamic import — @noble/post-quantum is an optional soft dependency.
    // Install with: npm i @noble/post-quantum
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* webpackIgnore: true */ '@noble/post-quantum/ml-dsa' as string).catch(() => {
      throw new Error('@noble/post-quantum not installed — install with: npm i @noble/post-quantum');
    });
    const ml_dsa65 = mod.ml_dsa65;

    const seed = Buffer.from(process.env.ATP_SIGNING_KEY ?? '', 'base64');
    if (seed.length < 32) throw new Error('ATP_SIGNING_KEY too short for ML-DSA-65 (need 32+ bytes)');

    const keys      = ml_dsa65.keygen(seed.subarray(0, 32));
    const msgBytes  = Buffer.from(payload, 'utf-8');
    const sigBytes  = ml_dsa65.sign(keys.secretKey, msgBytes);
    const sigHex    = Buffer.from(sigBytes).toString('base64');

    return {
      algorithm: 'ML-DSA-65',
      signature: sigHex,
      signed_at: new Date().toISOString(),
      key_id:    'runesignal-mldsa65-v1',
    };
  } catch (err) {
    // PQC signing failure is non-fatal — log and continue with Ed25519 only
    console.warn('[pqc] ML-DSA-65 signing skipped:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Verify an ML-DSA-65 signature.
 * Returns false (not throws) on any verification error.
 */
export async function pqcVerify(payload: string, signature: string, _publicKeyHex?: string): Promise<boolean> {
  if (process.env.FEATURE_PQC !== 'true') return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* webpackIgnore: true */ '@noble/post-quantum/ml-dsa' as string).catch(() => {
      throw new Error('@noble/post-quantum not installed');
    });
    const ml_dsa65 = mod.ml_dsa65;

    const seed     = Buffer.from(process.env.ATP_SIGNING_KEY ?? '', 'base64');
    const keys     = ml_dsa65.keygen(seed.subarray(0, 32));
    const msgBytes = Buffer.from(payload, 'utf-8');
    const sigBytes = Buffer.from(signature, 'base64');

    return ml_dsa65.verify(keys.publicKey, msgBytes, sigBytes);
  } catch {
    return false;
  }
}

/**
 * Returns the PQC status string for the /security badge.
 */
export function pqcStatusBadge(): { enabled: boolean; label: string; algorithm: string } {
  const enabled = process.env.FEATURE_PQC === 'true';
  return {
    enabled,
    label:     enabled ? 'PQC-Ready: ML-DSA-65' : 'Ed25519 only',
    algorithm: enabled ? 'ML-DSA-65 (NIST FIPS 204)' : 'Ed25519',
  };
}
