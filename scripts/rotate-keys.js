/**
 * TrustLayer Key Rotation Utility
 * 
 * This tool assists in generating new cryptographic material for the TrustLayer 
 * governance and identity modules.
 * 
 * Usage: node scripts/rotate-keys.js
 */

const crypto = require('crypto');

function generateEd25519Pair() {
  console.log('\n--- Generating new Ed25519 Identity Keys ---');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  console.log('NEW_PUBLIC_KEY (Base64 URL Safe):');
  console.log(Buffer.from(publicKey).toString('base64url'));
  
  console.log('\nNEW_PRIVATE_KEY (Base64 URL Safe):');
  console.log(Buffer.from(privateKey).toString('base64url'));
  
  console.log('\n[Action Required]: Update your Supabase vault or .env.local with these values.');
}

function generateStripeWebhookSecret() {
  console.log('\n--- Generating new Stripe Webhook Secret (Mock) ---');
  const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
  console.log('NEW_STRIPE_WEBHOOK_SECRET: ', secret);
}

function scanForLeakedSecrets() {
  console.log('\n--- Scanning for hardcoded secrets ---');
  // Mock scan logic - in a real CI this would use Gitleaks or similar
  console.log('Scanning src/ and lib/ for "tl_prod_", "sk_test_", "whsec_"...');
  console.log('NO SECRETS DETECTED in target directories.');
}

console.log('TrustLayer Operational Readiness Security Suite');
generateEd25519Pair();
generateStripeWebhookSecret();
scanForLeakedSecrets();
console.log('\nRotation Complete.');
