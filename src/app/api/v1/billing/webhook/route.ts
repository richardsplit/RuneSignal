import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@lib/stripe';
import { createServerClient } from '@lib/db/supabase';

export const dynamic = 'force-dynamic';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Use service role to bypass RLS for background updates
  const supabase = await createServerClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!tenantId) {
          console.error('Missing tenant_id in checkout session');
          break;
        }

        // Fetch subscription to get plan details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        
        // Define tier mapping
        const tier = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'enterprise';

        const { error } = await supabase
          .from('tenants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_tier: tier,
            billing_cycle_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            billing_cycle_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          })
          .eq('id', tenantId);

        if (error) throw error;
        console.log(`Updated tenant ${tenantId} to tier ${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabase
          .from('tenants')
          .update({
            plan_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) throw error;
        console.log(`Downgraded tenant for subscription ${subscription.id} to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionIdStr = (invoice as any).subscription as string;
        
        if (subscriptionIdStr) {
          const { data: updatedTenants } = await supabase
            .from('tenants')
            .update({ plan_tier: 'past_due' })
            .eq('stripe_subscription_id', subscriptionIdStr)
            .select('id');
            
          if (updatedTenants && updatedTenants.length > 0) {
            const tenantId = updatedTenants[0].id;
            const { WebhookEmitter } = await import('@lib/webhooks/emitter');
            await WebhookEmitter.notifyTenant(
              tenantId,
              `⚠️ Payment failed — tenant on past_due plan`,
              { customer: invoice.customer, amount: invoice.amount_due }
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
