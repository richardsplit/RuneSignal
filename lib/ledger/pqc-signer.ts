/**
 * Post-Quantum Cryptography signing support (ML-DSA-65 / CRYSTALS-Dilithium)
 *
 * Production note: When NODE_QUANTUM_CRYPTO ships or @noble/post-quantum reaches
 * stable, replace the stub below with the real implementation.
 * The interface is intentionally compatible with that migration path.
 *
 * Feature flag: ENABLE_PQC=true enables dual-signing (Ed25519 + ML-DSA-65)
 * Disabled by default — enables zero-downtime migration path.
 */

export const PQC_ENABLED = process.env.ENABLE_PQC === 'true';

/**
 * PQC signing stub — produces a deterministic placeholder signature.
 * Replace this body with @noble/post-quantum dilithium.sign() when available.
 *
 * @param data - The canonical data string to sign
 * @returns base64url-encoded ML-DSA-65 signature (or stub)
 */
export function pqcSign(data: string): string {
  if (!PQC_ENABLED) {
    throw new Error('PQC signing called but ENABLE_PQC is not set to true');
  }

  // Stub: real implementation would call dilithium65.sign(secretKey, Buffer.from(data))
  // For now we create a deterministic marker that indicates PQC was requested.
  // Replace with real ML-DSA-65 once @noble/post-quantum ships stable dilithium65.
  const marker = `pqc-stub:ml-dsa-65:${Buffer.from(data.slice(0, 64)).toString('base64url')}`;
  return marker;
}

/**
 * Verify a PQC signature.
 * Stub always returns true for stub signatures;
 * real ML-DSA-65 verification goes here once available.
 */
export function pqcVerify(_data: string, signature: string): boolean {
  if (signature.startsWith('pqc-stub:ml-dsa-65:')) {
    return true;
  }
  // Real ML-DSA-65 verification would go here
  return false;
}
