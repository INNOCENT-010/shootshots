// app/api/stripe/webhook/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true
});

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  
  
  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
  
  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  
  
  const creatorId = session.metadata?.creatorId;
  const planType = session.metadata?.planType;
  const featuredPosts = parseInt(session.metadata?.featured_posts || '0');
  const portfolioLimit = parseInt(session.metadata?.portfolio_limit || '5');
  
  if (!creatorId || !planType) {
    throw new Error('Missing creatorId or planType in session metadata');
  }
  
  try {
    const now = new Date().toISOString();
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Check if subscription already exists (created by client on success page)
    const { data: existingSub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('stripe_session_id', session.id)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    
    if (existingSub) {
      // UPDATE existing subscription with Stripe data
      
      
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
          metadata: {
            ...(existingSub.metadata || {}),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            stripe_payment_intent: session.payment_intent,
            plan_details: {
              featured_posts: featuredPosts,
              portfolio_limit: portfolioLimit
            },
            webhook_processed_at: now,
            webhook_event: 'checkout.session.completed',
            session_completed: true
          },
          updated_at: now
        })
        .eq('id', existingSub.id);
      
      if (updateError) throw updateError;
      
      
    } else {
      // CREATE new subscription (webhook arrived before client success page)
      
      
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          creator_id: creatorId,
          plan_type: planType,
          stripe_session_id: session.id,
          status: 'active',
          featured_posts_included: featuredPosts,
          featured_posts_used: 0,
          expires_at: expiresAt.toISOString(),
          created_at: now,
          metadata: {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            stripe_payment_intent: session.payment_intent,
            plan_details: {
              featured_posts: featuredPosts,
              portfolio_limit: portfolioLimit
            },
            webhook_created_at: now,
            webhook_event: 'checkout.session.completed',
            session_completed: true
          }
        });
      
      if (insertError) throw insertError;
      
      
    }
    
    // CRITICAL FIX: Update profile with ONLY EXISTING COLUMNS
    const profileUpdate = {
      is_premium: planType !== 'free',
      subscription_tier: planType,
      subscription_expires_at: expiresAt.toISOString(),
      portfolio_limit: portfolioLimit,
      featured_requests_available: featuredPosts,
      updated_at: now,
      last_payment_date: now
    };
    
    
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', creatorId);
    
    if (profileError) {
      throw profileError;
    }
    
    
    
  } catch (error: any) {
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  
  
  try {
    // Find the subscription in our database
    const { data: existingSub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('creator_id, metadata, plan_type')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!existingSub) {
      
      return;
    }
    
    const status = subscription.status;
    const expiresAt = new Date(subscription.current_period_end * 1000);
    const now = new Date().toISOString();
    
    // Update subscription status and metadata
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: status,
        expires_at: expiresAt.toISOString(),
        metadata: {
          ...(existingSub.metadata || {}),
          stripe_subscription_status: status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          webhook_event: 'customer.subscription.updated',
          webhook_updated_at: now
        },
        updated_at: now
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) throw updateError;
    
    // Update user profile based on subscription status
    if (status === 'active' || status === 'trialing') {
      // Ensure user is marked as premium
      const profileUpdate = {
        is_premium: true,
        subscription_tier: existingSub.plan_type,
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now
      };
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', existingSub.creator_id);
      
      if (profileError) throw profileError;
      
      
    } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due' || status === 'incomplete_expired') {
      // Downgrade user to free
      
      
      // Get plan defaults for free plan
      const profileUpdate = {
        is_premium: false,
        subscription_tier: 'free',
        subscription_expires_at: expiresAt.toISOString(),
        portfolio_limit: 5,
        featured_requests_available: 0,
        updated_at: now
      };
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', existingSub.creator_id);
      
      if (profileError) throw profileError;
      
      
    }
    
    
    
  } catch (error: any) {
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  
  
  try {
    const { data: existingSub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('creator_id, plan_type')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!existingSub) {
      
      return;
    }
    
    const now = new Date().toISOString();
    
    // Mark subscription as canceled
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        metadata: {
          webhook_event: 'customer.subscription.deleted',
          webhook_updated_at: now,
          deleted_at: now
        },
        updated_at: now
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) throw updateError;
    
    // Downgrade user to free
    const profileUpdate = {
      is_premium: false,
      subscription_tier: 'free',
      portfolio_limit: 5,
      featured_requests_available: 0,
      updated_at: now
    };
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', existingSub.creator_id);
    
    if (profileError) throw profileError;
    
    
    
  } catch (error: any) {
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  
  
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) {
      
      return;
    }
    
    const now = new Date().toISOString();
    
    // Update subscription's last payment date
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        last_payment_at: now,
        metadata: {
          last_invoice_id: invoice.id,
          last_payment_amount: invoice.amount_paid,
          last_payment_currency: invoice.currency,
          webhook_event: 'invoice.payment_succeeded',
          webhook_updated_at: now
        },
        updated_at: now
      })
      .eq('stripe_subscription_id', subscriptionId as string);
    
    if (updateError) throw updateError;
    
    
    
  } catch (error: any) {
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  
  
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) {
      
      return;
    }
    
    const now = new Date().toISOString();
    
    // Update subscription status to past_due
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'past_due',
        metadata: {
          failed_invoice_id: invoice.id,
          failed_payment_attempt: invoice.attempt_count,
          webhook_event: 'invoice.payment_failed',
          webhook_updated_at: now
        },
        updated_at: now
      })
      .eq('stripe_subscription_id', subscriptionId as string);
    
    if (updateError) throw updateError;
    
    // Optionally: Send notification to user about failed payment
    
    
  } catch (error: any) {
    throw error;
  }
}

// Helper endpoint to verify webhook is working
export async function GET() {
  try {
    // Get count of active subscriptions
    const { count, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (error) throw error;
    
    return NextResponse.json({ 
      status: 'Webhook endpoint is operational',
      active_subscriptions: count || 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'Webhook endpoint error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}