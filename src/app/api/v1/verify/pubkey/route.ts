import { NextResponse } from 'next/server';
import { getLedgerSigner } from '../../../../lib/ledger/signer';

export async function GET() {
  try {
    const signer = getLedgerSigner();
    const pubKeyPem = signer.exportPublicKeyPEM();
    
    return NextResponse.json({
      status: 'active',
      key_id: process.env.ATP_SIGNING_KEY_ID || 'key_default',
      public_key: pubKeyPem
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to retrieve public key' }, { status: 500 });
  }
}
