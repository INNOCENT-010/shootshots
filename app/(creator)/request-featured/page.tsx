
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Star, AlertCircle, CheckCircle, Clock, Loader2, Zap, Crown } from 'lucide-react';
import Link from 'next/link';

interface PortfolioItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title?: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

interface ProfileData {
  id: string;
  subscription_tier: string; // 'free', 'premium', 'pro'
  featured_requests_available: number;
  subscription_expires_at?: string;
  subscription_plan_id?: string;
}

interface SubscriptionPlan {
  id: string;
  plan_type: string;
  display_name: string;
  description: string;
  max_posts: number;
  max_media: number;
  max_media_per_post: number;
  price_monthly: string;
  is_active: boolean;
  features: string[];
}

interface SubscriptionStatus {
  tier: string;
  expiresAt?: string;
  isExpired: boolean;
  canRequestFeatured: boolean;
  availableRequests: number;
  maxRequests: number;
  planDetails?: SubscriptionPlan;
}

export default function RequestFeaturedPage() {
  const router = useRouter();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    tier: 'free',
    isExpired: true,
    canRequestFeatured: false,
    availableRequests: 0,
    maxRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (user) {
      loadCreatorData();
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
  
  async function loadCreatorData() {
    try {
      setLoading(true);
      
      // Load subscription plans first
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (plansError) throw plansError;
      
      setSubscriptionPlans(plans || []);
      
      // Load creator's portfolio items
      const { data: items, error: itemsError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      
      if (itemsError) throw itemsError;
      
      // Get creator profile with subscription data (NEW SYSTEM ONLY)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          subscription_tier,
          subscription_plan_id,
          featured_requests_available,
          subscription_expires_at
        `)
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw profileError;
      }
      
      // Also check subscription status in subscriptions table
      const { data: activeSubscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('status, expires_at, plan_type')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (subError && subError.code !== 'PGRST116') {
      }
      
      const latestSubscription = activeSubscriptions?.[0];
      
      setPortfolioItems(items || []);
      setProfileData(profile);
      
      // Calculate subscription status
      const status = calculateSubscriptionStatus(profile, latestSubscription, plans || []);
      setSubscriptionStatus(status);
      
      } catch (error) {
      setMessage({ text: 'Error loading data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }
  
  function calculateSubscriptionStatus(
    profile: ProfileData | null, 
    activeSubscription: any,
    plans: SubscriptionPlan[]
  ): SubscriptionStatus {
    if (!profile) {
      return {
        tier: 'free',
        isExpired: true,
        canRequestFeatured: false,
        availableRequests: 0,
        maxRequests: 0
      };
    }
    
    // Default to free tier
    let tier = 'free';
    let expiresAt: string | undefined;
    let isExpired = true;
    
    // Check profile subscription data (NEW SYSTEM)
    if (profile.subscription_tier && profile.subscription_tier !== 'free') {
      tier = profile.subscription_tier;
      expiresAt = profile.subscription_expires_at;
      
      // Check expiration
      if (expiresAt) {
        isExpired = new Date(expiresAt) < new Date();
      } else {
        // If no expiration date, assume it's active
        isExpired = false;
      }
    }
    
    // Also check subscriptions table as backup
    if (activeSubscription && activeSubscription.plan_type && activeSubscription.plan_type !== 'free') {
      tier = activeSubscription.plan_type;
      expiresAt = activeSubscription.expires_at;
      
      if (expiresAt) {
        isExpired = new Date(expiresAt) < new Date();
      } else {
        isExpired = false;
      }
    }
    
    // Find plan details
    const planDetails = plans.find(p => p.plan_type === tier);
    
    // Calculate max requests based on plan
    let maxRequests = 0;
    if (planDetails) {
      // Extract featured requests from features array
      const featuredRequestsFeature = planDetails.features.find(f => 
        f.includes('featured requests') || f.includes('featured request')
      );
      if (featuredRequestsFeature) {
        const match = featuredRequestsFeature.match(/(\d+)\s*(featured requests|featured request)/i);
        if (match) {
          maxRequests = parseInt(match[1]);
        }
      }
    } else {
      // Fallback to hardcoded values
      switch (tier) {
        case 'premium': maxRequests = 3; break;
        case 'pro': maxRequests = 10; break;
        default: maxRequests = 0;
      }
    }
    
    const availableRequests = profile.featured_requests_available || 0;
    
    // Can request featured if:
    // 1. Not free tier
    // 2. Not expired
    // 3. Has available requests
    const canRequestFeatured = tier !== 'free' && !isExpired && availableRequests > 0;
    
    return {
      tier,
      expiresAt,
      isExpired,
      canRequestFeatured,
      availableRequests,
      maxRequests,
      planDetails
    };
  }
  
  async function submitFeaturedRequest() {
    if (!selectedItemId) {
      setMessage({ text: 'Please select a portfolio item', type: 'error' });
      return;
    }
    
    if (!subscriptionStatus.canRequestFeatured) {
      if (subscriptionStatus.tier === 'free') {
        setMessage({ 
          text: 'Premium subscription required. Upgrade to request featured placement.', 
          type: 'error' 
        });
      } else if (subscriptionStatus.isExpired) {
        setMessage({ 
          text: 'Your subscription has expired. Please renew to request featured placement.', 
          type: 'error' 
        });
      } else if (subscriptionStatus.availableRequests <= 0) {
        setMessage({ 
          text: 'No featured requests available. Please upgrade your plan or wait for next billing cycle.', 
          type: 'error' 
        });
      } else {
        setMessage({ 
          text: 'Unable to submit request. Please check your subscription status.', 
          type: 'error' 
        });
      }
      return;
    }
    
    setSubmitting(true);
    setMessage(null);
    
    try {
      // First, check if item is already featured
      const { data: existingItem } = await supabase
        .from('portfolio_items')
        .select('is_featured')
        .eq('id', selectedItemId)
        .single();
      
      if (existingItem?.is_featured) {
        setMessage({ 
          text: 'This item is already featured', 
          type: 'error' 
        });
        return;
      }
      
      // Check for existing pending request for this item
      const { data: existingRequest } = await supabase
        .from('featured_requests')
        .select('id')
        .eq('portfolio_item_id', selectedItemId)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (existingRequest) {
        setMessage({ 
          text: 'This item already has a pending featured request', 
          type: 'error' 
        });
        return;
      }
      
      // Create featured request
      const { data, error } = await supabase
        .from('featured_requests')
        .insert({
          portfolio_item_id: selectedItemId,
          creator_id: user.id,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Decrement featured requests in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          featured_requests_available: Math.max(0, subscriptionStatus.availableRequests - 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setMessage({ 
        text: 'Featured request submitted successfully! Admin review takes 24-48 hours.', 
        type: 'success' 
      });
      
      // Refresh data
      await loadCreatorData();
      setSelectedItemId('');
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
      
    } catch (error: any) {
      setMessage({ 
        text: `Error: ${error.message || 'Failed to submit request'}`, 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  const getDisplayTierName = () => {
    return subscriptionStatus.planDetails?.display_name || 
           subscriptionStatus.tier.toUpperCase();
  };
  
  const getTierColor = () => {
    switch (subscriptionStatus.tier) {
      case 'pro': return 'text-purple-400';
      case 'premium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Request Featured Placement</h1>
        <p className="text-gray-400">
          Get your work highlighted with a golden star and priority placement
        </p>
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-700 text-green-300' 
            : 'bg-red-900/30 border border-red-700 text-red-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}
      
      {!subscriptionStatus.canRequestFeatured ? (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-500 mr-3 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                {subscriptionStatus.tier === 'free' ? 'Premium Subscription Required' : 
                 subscriptionStatus.isExpired ? 'Subscription Expired' : 'No Featured Requests Available'}
              </h3>
              <p className="text-gray-300 mb-4">
                {subscriptionStatus.tier === 'free' 
                  ? 'You need an active premium subscription to request featured placement. Featured posts get priority visibility, a golden star badge, and increased engagement.'
                  : subscriptionStatus.isExpired 
                  ? 'Your subscription has expired. Renew to regain access to featured placement requests.'
                  : 'You have used all your available featured requests for this billing cycle.'
                }
              </p>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/subscription" 
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {subscriptionStatus.tier === 'free' ? 'View Premium Plans' : 'Manage Subscription'}
                </Link>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Subscription Status Card */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Your Plan</h3>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className={`h-5 w-5 ${getTierColor()}`} />
                  <div className={`text-2xl font-bold ${getTierColor()}`}>
                    {getDisplayTierName()}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {subscriptionStatus.expiresAt ? (
                    <>Expires: {new Date(subscriptionStatus.expiresAt).toLocaleDateString()}</>
                  ) : (
                    <>Active subscription</>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Featured Requests:</span>
                  <span className="font-medium text-white">
                    {subscriptionStatus.maxRequests - subscriptionStatus.availableRequests} / {subscriptionStatus.maxRequests}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getTierColor().replace('text', 'bg')}`}
                    style={{ 
                      width: `${Math.min(100, ((subscriptionStatus.maxRequests - subscriptionStatus.availableRequests) / subscriptionStatus.maxRequests) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400">
                  Available: {subscriptionStatus.availableRequests} requests left
                </div>
              </div>
            </div>
            
            {/* Benefits Card */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Featured Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Star className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Golden star badge on your post</span>
                </li>
                <li className="flex items-start">
                  <Star className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Priority placement in home feed</span>
                </li>
                <li className="flex items-start">
                  <Star className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 shrink-0" />
                  <span className="text-gray-300">7 days of featuring duration</span>
                </li>
                <li className="flex items-start">
                  <Star className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Increased visibility and engagement</span>
                </li>
              </ul>
            </div>
            
            {/* Guidelines Card */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Guidelines</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span className="text-gray-300">High-quality images/videos only</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Properly categorized content</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Complete descriptions required</span>
                </li>
                <li className="flex items-start">
                  <Clock className="h-4 w-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                  <span className="text-gray-300">24-48 hour admin review time</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 shrink-0" />
                  <span className="text-gray-300">Admin approval required</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Portfolio Items Selection */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
            <h3 className="text-xl font-semibold text-white mb-6">Select a Portfolio Item</h3>
            
            {portfolioItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No portfolio items found</div>
                <Link 
                  href="/upload" 
                  className="text-yellow-400 hover:text-yellow-300"
                >
                  Upload your first portfolio item â†’
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {portfolioItems.map((item) => {
                    const isSelected = selectedItemId === item.id;
                    const isAlreadyFeatured = item.is_featured;
                    
                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-yellow-500 ring-2 ring-yellow-500/20'
                            : 'border-gray-700 hover:border-gray-500'
                        } ${isAlreadyFeatured ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (!isAlreadyFeatured) {
                            setSelectedItemId(item.id);
                          }
                        }}
                      >
                        {isAlreadyFeatured && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                            <div className="text-center">
                              <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                              <div className="text-white font-medium">Already Featured</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="aspect-square bg-gray-800 relative">
                          {item.media_type === 'image' ? (
                            <img
                              src={item.media_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-image.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-gray-400">ðŸŽ¬ VIDEO</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 bg-gray-800/80">
                          <div className="font-medium text-sm text-white truncate">
                            {item.title || 'Untitled'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {item.category} â€¢ {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                              SELECTED
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-gray-800 pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-400">
                      {selectedItemId ? (
                        <span>Selected: {
                          portfolioItems.find(item => item.id === selectedItemId)?.title || 'Portfolio item'
                        }</span>
                      ) : (
                        <span>Click on an item to select it</span>
                      )}
                    </div>
                    
                    <button
                      onClick={submitFeaturedRequest}
                      disabled={!selectedItemId || submitting || subscriptionStatus.availableRequests <= 0}
                      className="w-full sm:w-auto px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors flex items-center justify-center"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Submit for Featured Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Available Requests Info */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Available Featured Requests</div>
                <div className="text-2xl font-bold text-white">
                  {subscriptionStatus.availableRequests}
                </div>
                <div className="text-xs text-gray-400">
                  {subscriptionStatus.tier === 'premium' ? '3 per month' : 
                   subscriptionStatus.tier === 'pro' ? '10 per month' : 
                   'Upgrade for featured requests'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Plan</div>
                <div className={`font-medium ${getTierColor()}`}>
                  {getDisplayTierName()}
                </div>
                {subscriptionStatus.expiresAt && (
                  <div className="text-xs text-gray-400">
                    Renews: {new Date(subscriptionStatus.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}