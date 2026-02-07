// app/(creator)/subscription/success/page.tsx - UPDATED THEME
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle, Star, Zap, Loader2, Mail, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const plan = searchParams.get('plan');
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);
  
  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
    setUser(session.user);
  }
  
  async function loadSubscription() {
    try {
      setLoading(true);
      setError(null);
      
      if (plan === 'free') {
        await activateFreePlan();
        return;
      }
      
      const pendingSub = localStorage.getItem('pendingSubscription');
      
      if (pendingSub && user) {
        const data = JSON.parse(pendingSub);
        
        if (data.userId !== user.id) {
          localStorage.removeItem('pendingSubscription');
          sessionStorage.removeItem('pendingSubscription');
          await checkDatabaseSubscription();
          return;
        }
        
        const success = await createSubscriptionImmediately(data, user.id, sessionId);
        
        if (success) {
          setSubscription({
            plan_type: data.planId,
            plan_name: data.planName,
            status: 'active',
            is_pending: false,
            features: data.features
          });
          
          localStorage.removeItem('pendingSubscription');
          sessionStorage.removeItem('pendingSubscription');
        } else {
          await checkDatabaseSubscription();
        }
      } else {
        await checkDatabaseSubscription();
      }
    } catch (err) {
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }
  
  async function activateFreePlan() {
    try {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_type', 'free')
        .single();
      
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const profileUpdate = {
        is_premium: false,
        subscription_tier: 'free',
        subscription_expires_at: expiresAt.toISOString(),
        portfolio_limit: freePlan?.max_media || 5,
        featured_requests_available: 0,
        updated_at: new Date().toISOString()
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      setSubscription({
        plan_type: 'free',
        plan_name: 'Free Plan',
        status: 'active',
        is_pending: false,
        features: freePlan?.features || [],
        portfolio_limit: freePlan?.max_media || 5,
        featured_requests: 0
      });
    } catch (error) {
      setError('Failed to activate free plan');
    }
  }
  
  async function createSubscriptionImmediately(pendingData: any, userId: string, sessionId: string | null) {
    try {
      const { data: planDetails } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_type', pendingData.planId)
        .single();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const dbPlanType = pendingData.planId === 'free' ? null : 'premium';
      
      if (dbPlanType) {
        const subscriptionData = {
          creator_id: userId,
          plan_type: dbPlanType,
          status: 'active',
          stripe_session_id: sessionId,
          featured_posts_included: pendingData.features?.featuredRequests || 0,
          featured_posts_used: 0,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          metadata: {
            source: 'client_immediate',
            actual_tier: pendingData.planId,
            original_plan: pendingData.planId
          }
        };
        
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);
        
        if (subError) 
      }
      
      const profileUpdate = {
        is_premium: pendingData.planId !== 'free',
        subscription_tier: pendingData.planId,
        subscription_expires_at: expiresAt.toISOString(),
        portfolio_limit: pendingData.features?.portfolioItems || 
                       (pendingData.planId === 'premium' ? 50 : 200),
        featured_requests_available: pendingData.features?.featuredRequests || 0,
        updated_at: new Date().toISOString()
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);
      
      if (profileError) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  async function checkDatabaseSubscription() {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at, is_premium, portfolio_limit, featured_requests_available')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        setError('Failed to load profile');
        return;
      }
      
      if (profile?.subscription_tier) {
        const planType = profile.subscription_tier;
        
        const { data: planDetails } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_type', planType)
          .maybeSingle();
        
        let planName = 'Free';
        if (planType === 'premium') planName = 'Premium';
        if (planType === 'pro') planName = 'Professional';
        
        setSubscription({
          plan_type: planType,
          plan_name: planName,
          is_pending: false,
          status: 'active',
          features: planDetails?.features || [],
          portfolio_limit: profile.portfolio_limit,
          featured_requests: profile.featured_requests_available
        });
      } else {
        setSubscription(null);
        setError('No subscription found');
      }
    } catch (error) {
      setError('Failed to check subscription status');
    }
  }
  
  useEffect(() => {
    if (subscription?.is_pending) {
      const intervalId = setInterval(async () => {
        await checkDatabaseSubscription();
      }, 10000);
      
      return () => clearInterval(intervalId);
    }
  }, [subscription?.is_pending, user, sessionId]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (error || !subscription) {
    return <ErrorScreen error={error} />;
  }
  
  return (
    <SuccessScreen 
      subscription={subscription} 
      isPending={subscription.is_pending} 
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center">
      <div className="flex items-center mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mr-3" />
        <span className="text-xl">Activating your subscription...</span>
      </div>
      <p className="text-gray-600 text-center max-w-md">
        This usually takes just a few seconds. Please don't close this window.
      </p>
    </div>
  );
}

function ErrorScreen({ error }: { error?: string | null }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-red-50 rounded-full mb-6 border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Something Went Wrong</h2>
        <p className="text-gray-600 mb-6">
          {error || 'We couldn\'t find your subscription details.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/support"
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ subscription, isPending }: any) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-24 w-24 bg-green-50 rounded-full mb-8 border border-green-200">
              {isPending ? (
                <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              ) : (
                <CheckCircle className="h-12 w-12 text-green-600" />
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isPending ? 'Payment Received!' : 'Welcome to Premium!'}
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              {subscription.plan_name} Plan
            </p>
            {isPending ? (
              <p className="text-green-600">
                Finalizing your subscription...
              </p>
            ) : (
              <p className="text-green-700">
                All features are now active!
              </p>
            )}
          </div>
          
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-2xl font-bold mb-6">Your Plan Includes:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {subscription.portfolio_limit || subscription.features?.portfolioItems || 50} Portfolio Items
                  </div>
                  <div className="text-sm text-gray-500">Showcase your work</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {subscription.featured_requests || subscription.features?.featuredRequests || 0} Featured Requests
                  </div>
                  <div className="text-sm text-gray-500">Get noticed by clients</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {subscription.plan_type === 'premium' ? '100MB' : 
                     subscription.plan_type === 'pro' ? '500MB' : '10MB'} File Size
                  </div>
                  <div className="text-sm text-gray-500">Upload high-quality work</div>
                </div>
              </div>
              
              {subscription.plan_type === 'pro' && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="h-10 w-10 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-100">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">14-Day Featuring</div>
                    <div className="text-sm text-gray-500">Extended visibility</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-center transition-colors"
            >
              {isPending ? 'Go to Dashboard' : 'Start Creating'}
            </Link>
            
            <Link
              href="/upload"
              className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-center transition-colors"
            >
              Upload Portfolio Item
            </Link>
            
            {isPending && (
              <Link
                href="/support"
                className="px-8 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-center transition-colors border border-blue-100"
              >
                Need Help?
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}