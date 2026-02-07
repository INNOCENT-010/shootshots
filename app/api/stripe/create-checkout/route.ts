// app/api/stripe/create-checkout/route.ts - FIXED WITH YEARLY SUPPORT
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with error handling
let stripe: Stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10' 
  });
} catch (error) {
}

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

// Get plan details from database instead of hardcoded
async function getPlanDetails(planType: string) {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('plan_type', planType)
      .single();

    if (error) {
      // Fallback to hardcoded plans
      return getHardcodedPlan(planType);
    }

    return plan;
  } catch (error) {
    return getHardcodedPlan(planType);
  }
}

function getHardcodedPlan(planType: string) {
  const PLANS: any = {
    free: {
      name: 'Free',
      price_monthly: '0.00',
      features: ['5 media uploads', '3 posts max', 'Basic portfolio'],
      max_posts: 3,
      max_media: 5
    },
    premium: {
      name: 'Premium',
      price_monthly: '5.99',
      features: ['50 media uploads', '10 posts max', '3 featured requests/month', 'Priority support'],
      max_posts: 10,
      max_media: 50,
      featured_requests: 3
    },
    pro: {
      name: 'Professional',
      price_monthly: '9.99',
      features: ['200 media uploads', '25 posts max', '10 featured requests/month', '24/7 priority support'],
      max_posts: 25,
      max_media: 200,
      featured_requests: 10
    }
  };
  
  return PLANS[planType] || PLANS.free;
}

// Function to get correct price ID
function getPriceId(planId: string, billingInterval: string = 'month') {
  
  
  // Yearly pricing
  if (billingInterval === 'year') {
    if (planId === 'premium') {
      return process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID;
    } else if (planId === 'pro') {
      return process.env.STRIPE_PRO_YEARLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID;
    }
  }
  
  // Monthly pricing (default)
  if (planId === 'premium') {
    return process.env.STRIPE_PREMIUM_PRICE_ID;
  } else if (planId === 'pro') {
    return process.env.STRIPE_PRO_PRICE_ID;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    
    
    // Parse request body
    const body = await request.json();
    const { planId, creatorId, billingInterval = 'month' } = body; // ADDED billingInterval
    
    
    
    if (!planId || !creatorId) {
      return NextResponse.json(
        { error: 'Missing planId or creatorId' },
        { status: 400 }
      );
    }
    
    // Get plan details
    const planDetails = await getPlanDetails(planId);
    
    if (!planDetails) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }
    
    // Handle free plan (no Stripe checkout needed)
    if (planId === 'free') {
      try {
        
        
        // Insert free subscription
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            creator_id: creatorId,
            plan_type: 'free',
            status: 'active',
            featured_posts_included: 0,
            featured_posts_used: 0,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
          });

        if (insertError) {
          // If already exists, update it
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_type: 'free',
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('creator_id', creatorId);
        }

        // Update profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: false,
            subscription_tier: 'free',
            portfolio_limit: planDetails.max_media || 5,
            featured_requests_available: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', creatorId);

        if (profileError) {
        }

        
        
        return NextResponse.json({ 
          success: true,
          message: 'Free plan activated',
          url: `${process.env.NEXT_PUBLIC_URL}/subscription/success?plan=free`
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Failed to activate free plan' },
          { status: 500 }
        );
      }
    }
    
    // For paid plans, check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment service is currently unavailable' },
        { status: 500 }
      );
    }
    
    // Get the price ID based on plan and billing interval
    const priceId = getPriceId(planId, billingInterval);
    
    if (!priceId) {
      return NextResponse.json(
        { 
          error: 'Payment configuration error. Please contact support.',
          details: `Missing price ID for ${planId} plan (${billingInterval})`
        },
        { status: 500 }
      );
    }
    
    try {
      // Verify the price exists in Stripe
      const price = await stripe.prices.retrieve(priceId);
      console.log('Price verified:', { 
        id: price.id, 
        amount: price.unit_amount, 
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Invalid price configuration',
          details: `Price ID ${priceId} not found in Stripe`
        },
        { status: 400 }
      );
    }
    
    // Get the base URL for success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      metadata: {
        creatorId,
        planType: planId,
        plan_name: planDetails.name,
        billingInterval: billingInterval, // ADD THIS
        featured_posts: (planDetails.featured_requests || 0).toString(),
        portfolio_limit: (planDetails.max_media || 50).toString(),
        max_posts: (planDetails.max_posts || 10).toString()
      },
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&interval=${billingInterval}`, // ADD interval
      cancel_url: `${baseUrl}/subscription?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Add trial only for premium monthly
      ...(planId === 'premium' && billingInterval === 'month' ? {
        subscription_data: {
          trial_period_days: 7
        }
      } : {})
    });
    
    
    
    
    
    
    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
      success: true,
      billingInterval: billingInterval // Return for debugging
    });
    
  } catch (error: any) {
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Test endpoint to verify Stripe connection
export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json({
        status: 'Stripe not initialized',
        error: 'Check STRIPE_SECRET_KEY environment variable',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Test Stripe connection by listing products
    const products = await stripe.products.list({ limit: 3 });
    
    return NextResponse.json({
      status: 'Stripe API is working',
      products: products.data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active
      })),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'Stripe API error',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}