import crypto from 'crypto';

/**
 * Basic symmetrical encryption helper for storing AWS/Snowflake keys safely in DB.
 * In production this would use AWS KMS or a similarly robust system.
 */
export class SovereignEncryption {
  private static getSecret() {
    const secret = process.env.JWT_SECRET || 'fallback-dev-secret-32-chars-long!';
    // Ensure accurate 32 bytes for aes-256
    return crypto.createHash('sha256').update(secret).digest();
  }

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getSecret(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  static decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted format');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.getSecret(), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
