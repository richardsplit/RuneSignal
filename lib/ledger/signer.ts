import * as crypto from 'crypto';

/**
 * LedgerSigner class implementing Ed25519 signing for the Audit Ledger.
 * Uses Node.js native crypto module.
 */
export class LedgerSigner {
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;

  constructor() {
    const rawKeyBase64 = process.env.ATP_SIGNING_KEY;
    if (!rawKeyBase64) {
      throw new Error('ATP_SIGNING_KEY environment variable is not set');
    }

    try {
      // Decode base64 to get the raw private key bytes
      const rawPrivateKey = Buffer.from(rawKeyBase64, 'base64');

      // Create a KeyObject from the raw private key
      this.privateKey = crypto.createPrivateKey({
        key: rawPrivateKey,
        format: 'der',
        type: 'pkcs8',
      });
      
      // Derive public key from private key
      this.publicKey = crypto.createPublicKey(this.privateKey);
    } catch (error) {
      console.error('Failed to initialize LedgerSigner with the provided key.', error);
      throw new Error('Invalid ATP_SIGNING_KEY');
    }
  }

  /**
   * Signs a payload using Ed25519
   * @param payloadBuffer - the data to sign
   * @returns base64 encoded signature
   */
  sign(payloadBuffer: Buffer): string {
    const signature = crypto.sign(null, payloadBuffer, this.privateKey);
    return signature.toString('base64');
  }

  /**
   * Verifies an Ed25519 signature
   * @param payloadBuffer - the signed data
   * @param signatureBase64 - the base64 encoded signature to verify
   * @returns boolean indicating if signature is valid
   */
  verify(payloadBuffer: Buffer, signatureBase64: string): boolean {
    try {
      const signatureBuffer = Buffer.from(signatureBase64, 'base64');
      return crypto.verify(null, payloadBuffer, this.publicKey, signatureBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Exports the public key in PEM format (SubjectPublicKeyInfo)
   */
  exportPublicKeyPEM(): string {
    return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }
}

// Singleton instance
let signerInstance: LedgerSigner | null = null;

export function getLedgerSigner(): LedgerSigner {
  if (!signerInstance) {
    signerInstance = new LedgerSigner();
  }
  return signerInstance;
}
