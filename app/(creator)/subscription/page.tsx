// app/(creator)/subscription/page.tsx - UPDATED WITH WHITE/DARK GREEN THEME
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  CheckCircle, XCircle, Star, Zap, Shield, Globe, 
  CreditCard, Calendar, RefreshCw, Loader2, Crown, Check 
} from 'lucide-react';
import Link from 'next/link';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: {
    portfolioItems: number;
    featuredRequests: number;
    analytics: string;
    support: string;
    fileSize: string;
    categories: string;
    featuredDuration?: number;
    prioritySupport?: boolean;
    customDomain?: boolean;
    watermarkRemoval?: boolean;
  };
  stripePriceId?: string;
}

interface CurrentSubscription {
  id: string;
  plan_type: string;
  status: string;
  stripe_session_id?: string;
  expires_at: string;
  featured_posts_included: number;
  featured_posts_used: number;
  created_at: string;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: {
      portfolioItems: 5,
      featuredRequests: 0,
      analytics: 'Basic',
      support: 'Community',
      fileSize: '10MB',
      categories: 'Basic'
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 5.99,
    currency: 'USD',
    interval: 'month',
    features: {
      portfolioItems: 50,
      featuredRequests: 3,
      analytics: 'Advanced',
      support: 'Priority',
      fileSize: '100MB',
      categories: 'All',
      featuredDuration: 7,
      prioritySupport: true
    }
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: {
      portfolioItems: 200,
      featuredRequests: 10,
      analytics: 'Full',
      support: '24/7',
      fileSize: '500MB',
      categories: 'All',
      featuredDuration: 14,
      prioritySupport: true,
      customDomain: true,
      watermarkRemoval: true
    }
  }
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      router.push('/login?redirect=/subscription');
      return;
    }
    
    setUser(session.user);
  }

  async function loadSubscriptionData() {
    try {
      // Get current subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
      }

      setCurrentSubscription(subscription || null);
    } catch (error) {
      setMessage({ text: 'Error loading subscription data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCheckout = async (planId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // If it's a free plan
      if (planId === 'free') {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            creator_id: user.id,
            plan_type: 'free',
            status: 'active',
            featured_posts_included: 0,
            featured_posts_used: 0,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (error) throw error;

        await supabase
          .from('profiles')
          .update({
            is_premium: false,
            subscription_tier: 'free',
            subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            portfolio_limit: 5,
            featured_requests_available: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        setMessage({ text: 'Switched to Free plan successfully!', type: 'success' });
        await loadSubscriptionData();
        return;
      }

      // Store subscription data BEFORE redirecting to Stripe
      const planData = {
        planId,
        planName: planId === 'premium' ? 'Premium' : 'Professional',
        price: planId === 'premium' ? 5.99 : 9.99,
        billingInterval: billingInterval,
        features: {
          portfolioItems: planId === 'premium' ? 50 : 200,
          featuredRequests: planId === 'premium' ? 3 : 10,
          fileSize: planId === 'premium' ? '100MB' : '500MB',
          featuredDuration: planId === 'premium' ? 7 : 14
        },
        timestamp: Date.now(),
        awaitingWebhook: true,
        userId: user.id
      };
      
      localStorage.setItem('pendingSubscription', JSON.stringify(planData));
      sessionStorage.setItem('pendingSubscription', JSON.stringify(planData));

      // Call Stripe API with billingInterval
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingInterval: billingInterval,
          creatorId: user.id
        })
      });

      if (!response.ok) {
        localStorage.removeItem('pendingSubscription');
        sessionStorage.removeItem('pendingSubscription');
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout failed');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      setMessage({ 
        text: `Error: ${error.message || 'Failed to process checkout'}`,
        type: 'error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return SUBSCRIPTION_PLANS[0]; // Free plan
    
    const plan = SUBSCRIPTION_PLANS.find(p => 
      p.id === currentSubscription.plan_type.toLowerCase()
    );
    
    return plan || SUBSCRIPTION_PLANS[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading subscription data...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  // Calculate yearly prices with 20% discount
  const getYearlyPrice = (monthlyPrice: number) => {
    return (monthlyPrice * 12 * 0.8).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
          <p className="text-gray-600">
            Choose the perfect plan for your photography business
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-white text-green-900 shadow-sm'
                  : 'text-gray-600 hover:text-green-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-white text-green-900 shadow-sm'
                  : 'text-gray-600 hover:text-green-900'
              }`}
            >
              Yearly <span className="text-green-600 text-sm ml-1">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Current Plan Status */}
        {currentSubscription && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center mb-2">
                  {currentPlan.id === 'pro' ? (
                    <Crown className="h-6 w-6 text-yellow-500 mr-3" />
                  ) : currentPlan.id === 'premium' ? (
                    <Star className="h-6 w-6 text-purple-500 mr-3" />
                  ) : (
                    <Check className="h-6 w-6 text-gray-400 mr-3" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Current Plan: {currentPlan.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {currentSubscription.status === 'active' 
                        ? `Active until ${new Date(currentSubscription.expires_at).toLocaleDateString()}`
                        : 'Inactive'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-gray-700">
                      Featured Requests: {currentSubscription.featured_posts_used} / {currentSubscription.featured_posts_included}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-gray-700">
                      Renews: {new Date(currentSubscription.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${currentPlan.price}
                  <span className="text-lg text-gray-500">/{billingInterval}</span>
                </div>
                {billingInterval === 'year' && currentPlan.price > 0 && (
                  <div className="text-sm text-green-600">
                    ${getYearlyPrice(currentPlan.price)}/year
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {currentSubscription.status === 'active' ? 'Active subscription' : 'Subscription ended'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = currentPlan.id === plan.id;
            const yearlyPrice = plan.price > 0 ? getYearlyPrice(plan.price) : '0';
            const isPopular = plan.id === 'premium'; // Make Premium the popular plan
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 border-2 transition-all bg-white ${
                  plan.id === 'pro'
                    ? 'border-yellow-500 shadow-lg'
                    : plan.id === 'premium'
                    ? 'border-green-600 shadow-lg'
                    : 'border-gray-300'
                } ${isCurrentPlan ? 'ring-2 ring-green-300' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </div>
                  </div>
                )}
                
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    {plan.id === 'pro' ? (
                      <Crown className="h-6 w-6 text-yellow-500 mr-2" />
                    ) : plan.id === 'premium' ? (
                      <Star className="h-6 w-6 text-green-600 mr-2" />
                    ) : (
                      <Check className="h-6 w-6 text-gray-400 mr-2" />
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-gray-900">
                      ${billingInterval === 'year' && plan.price > 0 ? yearlyPrice : plan.price}
                      <span className="text-lg text-gray-500">/{billingInterval}</span>
                    </div>
                    {billingInterval === 'year' && plan.price > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${(plan.price * 12 - parseFloat(yearlyPrice)).toFixed(2)} per year
                      </div>
                    )}
                    {plan.price === 0 && (
                      <div className="text-sm text-gray-500">No credit card required</div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm">
                    {plan.id === 'pro' ? 'For professional photographers and studios' :
                     plan.id === 'premium' ? 'For serious photographers growing their business' :
                     'For beginners and hobbyists'}
                  </p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                    <span className="text-gray-700">
                      {plan.features.portfolioItems} portfolio items
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                    <span className="text-gray-700">
                      {plan.features.featuredRequests} featured requests per month
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                    <span className="text-gray-700">{plan.features.analytics} analytics</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                    <span className="text-gray-700">{plan.features.support} support</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                    <span className="text-gray-700">{plan.features.fileSize} file size</span>
                  </div>
                  
                  {plan.features.featuredDuration && (
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                      <span className="text-gray-700">
                        {plan.features.featuredDuration}-day featuring
                      </span>
                    </div>
                  )}
                  
                  {plan.features.customDomain && (
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-3 shrink-0" />
                      <span className="text-gray-700">Custom domain support</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isProcessing || (isCurrentPlan && plan.id !== 'free')}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    plan.id === 'pro'
                      ? 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white'
                      : plan.id === 'premium'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white'
                      : 'bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white'
                  } ${isCurrentPlan ? 'opacity-75' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : plan.id === 'free' ? (
                    'Select Free Plan'
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Plan Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-gray-600 font-normal">Features</th>
                  <th className="text-center p-4">
                    <div className="font-semibold text-gray-700">Free</div>
                    <div className="text-sm text-gray-500">$0/month</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-semibold text-green-700">Premium</div>
                    <div className="text-sm text-gray-500">$5.99/month</div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-semibold text-yellow-600">Professional</div>
                    <div className="text-sm text-gray-500">$9.99/month</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-700">Portfolio Items</td>
                  <td className="text-center p-4 text-gray-600">5</td>
                  <td className="text-center p-4 text-gray-700">50</td>
                  <td className="text-center p-4 text-gray-700">200</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-700">Featured Requests</td>
                  <td className="text-center p-4 text-gray-600">0</td>
                  <td className="text-center p-4 text-gray-700">3/month</td>
                  <td className="text-center p-4 text-gray-700">10/month</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-700">File Size Limit</td>
                  <td className="text-center p-4 text-gray-600">10MB</td>
                  <td className="text-center p-4 text-gray-700">100MB</td>
                  <td className="text-center p-4 text-gray-700">500MB</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-700">Analytics</td>
                  <td className="text-center p-4 text-gray-600">Basic</td>
                  <td className="text-center p-4 text-gray-700">Advanced</td>
                  <td className="text-center p-4 text-gray-700">Full</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-gray-700">Support</td>
                  <td className="text-center p-4 text-gray-600">Community</td>
                  <td className="text-center p-4 text-gray-700">Priority</td>
                  <td className="text-center p-4 text-gray-700">24/7 Priority</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="p-4 text-gray-700">Featured Duration</td>
                  <td className="text-center p-4 text-gray-600">-</td>
                  <td className="text-center p-4 text-gray-700">7 days</td>
                  <td className="text-center p-4 text-gray-700">14 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I switch plans anytime?</h4>
              <p className="text-gray-600 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get prorated credit for your current plan.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards (Visa, MasterCard, American Express) and debit cards through our secure Stripe payment system.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How do featured requests work?</h4>
              <p className="text-gray-600 text-sm">
                Each featured request gives you priority placement in the feed. Admin approval is required and takes 24-48 hours.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">
                Absolutely! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do featured requests roll over?</h4>
              <p className="text-gray-600 text-sm">
                No, featured requests are reset each month. Unused requests do not roll over to the next month.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
              <p className="text-gray-600 text-sm">
                Yes! Premium plan includes a 7-day free trial. No credit card required to try Premium features.
              </p>
            </div>
          </div>
        </div>

        {/* Need Help Section */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            Need help choosing a plan? Contact our support team.
          </p>
          <Link
            href="mailto:support@shootshots.com"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-800"
          >
            <Zap className="h-4 w-4" />
            support@shootshots.com
          </Link>
        </div>
      </div>
    </div>
  );
}