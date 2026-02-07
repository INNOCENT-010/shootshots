// components/portfolio/RequestFeatureButton.tsx - UPDATED FOR NEW SYSTEM
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Star, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface RequestFeatureButtonProps {
  itemId: string;
  itemTitle?: string;
  creatorId: string;
  isFeatured: boolean;
  onSuccess?: () => void;
  className?: string;
}

export default function RequestFeatureButton({ 
  itemId, 
  itemTitle, 
  creatorId, 
  isFeatured, 
  onSuccess,
  className = '' 
}: RequestFeatureButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const checkEligibility = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirect=/creator');
        return false;
      }

      // Check if user owns this item
      if (user.id !== creatorId) {
        setMessage({ 
          text: 'You can only request featuring for your own content', 
          type: 'error' 
        });
        return false;
      }

      // Check if already featured
      if (isFeatured) {
        setMessage({ 
          text: 'This item is already featured', 
          type: 'error' 
        });
        return false;
      }

      // Check subscription - NEW SYSTEM: Check profile instead of subscriptions table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, featured_requests_available, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setMessage({ 
          text: 'Error checking subscription status', 
          type: 'error' 
        });
        return false;
      }

      // Check if user has a valid subscription tier
      const hasActiveSubscription = 
        profile.subscription_tier && 
        profile.subscription_tier !== 'free' &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

      if (!hasActiveSubscription) {
        setMessage({ 
          text: 'Active premium subscription required. Upgrade to request featured placement.', 
          type: 'error' 
        });
        return false;
      }

      // Check featured requests limit - NEW SYSTEM: Check featured_requests_available
      if (!profile.featured_requests_available || profile.featured_requests_available <= 0) {
        setMessage({ 
          text: 'No featured requests available. Please upgrade your plan or wait for next billing cycle.', 
          type: 'error' 
        });
        return false;
      }

      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from('featured_requests')
        .select('id')
        .eq('portfolio_item_id', itemId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        setMessage({ 
          text: 'This item already has a pending featured request', 
          type: 'error' 
        });
        return false;
      }

      return true;
    } catch (error) {
      setMessage({ 
        text: 'Error checking eligibility', 
        type: 'error' 
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    const isEligible = await checkEligibility();
    if (!isEligible) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get profile to check available requests - NEW SYSTEM
      const { data: profile } = await supabase
        .from('profiles')
        .select('featured_requests_available')
        .eq('id', user!.id)
        .single();

      if (!profile || !profile.featured_requests_available || profile.featured_requests_available <= 0) {
        setMessage({ 
          text: 'No featured requests available', 
          type: 'error' 
        });
        return;
      }

      // Create featured request
      const { data, error } = await supabase
        .from('featured_requests')
        .insert({
          portfolio_item_id: itemId,
          creator_id: user!.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          setMessage({ 
            text: 'Duplicate request detected', 
            type: 'error' 
          });
          return;
        }
        throw error;
      }

      // Decrement featured requests - NEW SYSTEM: Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          featured_requests_available: Math.max(0, profile.featured_requests_available - 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (updateError) {
        // Continue anyway, the request was created
      }

      setMessage({ 
        text: 'Featured request submitted! Admin review takes 24-48 hours.', 
        type: 'success' 
      });
      
      setShowConfirm(false);
      
      // Call onSuccess callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
      
      // Auto-clear success message
      setTimeout(() => setMessage(null), 5000);

    } catch (error: any) {
      setMessage({ 
        text: `Error: ${error.message || 'Failed to submit request'}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle initial click - show confirmation or check eligibility
  const handleInitialClick = async () => {
    setLoading(true);
    try {
      const isEligible = await checkEligibility();
      if (isEligible) {
        setShowConfirm(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isFeatured) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 bg-yellow-600 rounded-lg ${className}`}>
        <Star size={16} />
        <span className="text-sm font-medium">Featured</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleInitialClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Star size={16} />
        )}
        <span className="text-sm font-medium">Request Feature</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Star className="text-yellow-400" size={24} />
              <h3 className="text-xl font-bold">Request Featured Placement</h3>
            </div>
            
            <div className="mb-6 space-y-3">
              <p className="text-gray-300">
                Request featuring for "<span className="font-semibold">{itemTitle || 'this item'}</span>"?
              </p>
              <div className="bg-gray-800 rounded-lg p-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <span>Golden star badge for 7 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <span>Priority placement in feeds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <span>24-48 hour admin review</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-yellow-400" />
                    <span>Uses 1 featured request credit</span>
                  </li>
                </ul>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-900/30 text-green-300' 
                  : 'bg-red-900/30 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={submitRequest}
                disabled={loading}
                className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Submit Request'
                )}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setMessage(null);
                }}
                disabled={loading}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {message && !showConfirm && (
        <div className={`absolute top-full mt-2 p-3 rounded-lg min-w-[300px] z-10 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-700 text-green-300' 
            : 'bg-red-900/30 border border-red-700 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}