import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@lib/stripe';
import { createServerClient } from '@lib/db/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  
  // Try extracting the token from standard Headers first (useful if cookies are blocked)
  const authHeader = request.headers.get('authorization');
  const manualToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

  let user = null;
  
  if (manualToken) {
    const res = await supabase.auth.getUser(manualToken);
    user = res.data?.user;
  }
  
  if (!user) {
    const cookieRes = await supabase.auth.getUser();
    user = cookieRes.data?.user;
  }

  if (!user) {
    console.error('[Billing Checkout] User missing. Token present?', !!manualToken);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
  }

  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/billing`,
      client_reference_id: tenantId,
      metadata: {
        tenant_id: tenantId,
      },
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
