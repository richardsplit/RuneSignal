import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/db/supabase';
import { getLedgerSigner } from '../../../../../../lib/ledger/signer';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  
  // Notice: Independent verification path does not necessarily require tenant auth,
  // as external auditors may verify hashes without being tenant members.
  // (In production, an auditor token or API key might be required).
  
  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('request_id', params.id)
    .eq('event_type', 'provenance.certificate')
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, reason: 'Certificate not found' }, { status: 404 });
  }

  // Re-canonicalize payload and check signature
  const payloadString = JSON.stringify(data.payload, Object.keys(data.payload).sort());
  const dataToVerify = `${data.id}|${data.event_type}|${payloadString}|${data.created_at}`;
  
  const signer = getLedgerSigner();
  const isValid = signer.verify(Buffer.from(dataToVerify, 'utf-8'), data.signature);

  return NextResponse.json({
    valid: isValid,
    reason: isValid ? 'Signature cryptographically verified' : 'Tampering detected: signature mismatch'
  });
}
