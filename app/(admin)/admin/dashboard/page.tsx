'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  Users, Star, TrendingUp, DollarSign, 
  Calendar, Clock, CheckCircle, XCircle,
  BarChart3,
  CreditCard,
  UserCheck,
  Shield,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface AdminMetrics {
  totalCreators: number;
  premiumCreators: number;
  totalFeatured: number;
  pendingRequests: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  totalItems: number;
  totalViews: number;
}

interface RecentActivity {
  id: string;
  type: 'creator_signup' | 'premium_upgrade' | 'feature_request' | 'content_upload';
  description: string;
  user_name: string;
  created_at: string;
}

// Type for the activity data response
interface ActivityData {
  id: string;
  status: string;
  requested_at: string;
  portfolio_items: { title: string };
  creator_profile: { display_name: string };
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalCreators: 0,
    premiumCreators: 0,
    totalFeatured: 0,
    pendingRequests: 0,
    revenueThisMonth: 0,
    activeSubscriptions: 0,
    totalItems: 0,
    totalViews: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  async function loadAdminMetrics() {
    try {
      // Load all metrics in parallel
      const [
        { count: totalCreators },
        { count: premiumCreators },
        { count: totalItems },
        { data: featuredItems },
        { count: pendingRequests },
        { data: subscriptionsData },
        { data: activityData }
      ] = await Promise.all([
        // Total creators
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        
        // Premium creators
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
        
        // Total portfolio items
        supabase.from('portfolio_items').select('*', { count: 'exact', head: true }),
        
        // Featured items
        supabase.from('portfolio_items').select('id').eq('is_featured', true),
        
        // Pending featured requests
        supabase.from('featured_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        
        // Revenue data (if you have a subscriptions table)
        supabase.from('subscriptions').select('*').eq('status', 'active'),
        
        // Recent activity from featured requests
        supabase.from('featured_requests')
          .select(`
            id,
            status,
            requested_at,
            portfolio_items (
              title
            ),
            creator_profile:profiles!featured_requests_creator_id_fkey(
              display_name
            )
          `)
          .order('requested_at', { ascending: false })
          .limit(5)
      ]);

      // Calculate total views
      const { data: viewsData } = await supabase
        .from('portfolio_items')
        .select('view_count');

      const totalViews = viewsData?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;
      
      // Calculate revenue (assuming subscription price)
      const revenue = (subscriptionsData?.length || 0) * 29.99; // Example: $29.99 per subscription

      // Transform activity data with proper typing
      const activities: RecentActivity[] = (activityData || []).map((request: any) => ({
        id: request.id,
        type: 'feature_request',
        description: `Feature request ${request.status}`,
        user_name: request.creator_profile?.display_name || 'Unknown',
        created_at: request.requested_at
      }));

      setMetrics({
        totalCreators: totalCreators || 0,
        premiumCreators: premiumCreators || 0,
        totalFeatured: featuredItems?.length || 0,
        pendingRequests: pendingRequests || 0,
        revenueThisMonth: revenue,
        activeSubscriptions: premiumCreators || 0,
        totalItems: totalItems || 0,
        totalViews
      });

      setRecentActivity(activities);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform overview and management</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/featured"
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium flex items-center gap-2"
            >
              <Sparkles size={16} />
              Manage Featured
              {metrics.pendingRequests > 0 && (
                <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {metrics.pendingRequests}
                </span>
              )}
            </Link>
            <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
              Admin
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Creators */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="text-blue-400" size={24} />
            </div>
            <div className="text-3xl font-bold">{metrics.totalCreators}</div>
          </div>
          <h3 className="font-medium mb-1">Total Creators</h3>
          <p className="text-sm text-gray-400">Registered content creators</p>
        </div>

        {/* Premium Creators */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <UserCheck className="text-purple-400" size={24} />
            </div>
            <div className="text-3xl font-bold">{metrics.premiumCreators}</div>
          </div>
          <h3 className="font-medium mb-1">Premium Creators</h3>
          <p className="text-sm text-gray-400">Active subscriptions</p>
        </div>

        {/* Revenue */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="text-green-400" size={24} />
            </div>
            <div className="text-3xl font-bold">${metrics.revenueThisMonth.toFixed(2)}</div>
          </div>
          <h3 className="font-medium mb-1">Monthly Revenue</h3>
          <p className="text-sm text-gray-400">Current month earnings</p>
        </div>

        {/* Total Items */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <BarChart3 className="text-yellow-400" size={24} />
            </div>
            <div className="text-3xl font-bold">{metrics.totalItems}</div>
          </div>
          <h3 className="font-medium mb-1">Portfolio Items</h3>
          <p className="text-sm text-gray-400">Total uploaded content</p>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Featured Items */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-500/20 rounded-lg">
              <Star className="text-pink-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics.totalFeatured}</div>
              <h3 className="font-medium mb-1">Featured Items</h3>
              <p className="text-sm text-gray-400">Promoted content</p>
            </div>
          </div>
        </div>

        {/* Pending Requests with Link */}
        <Link 
          href="/featured" 
          className="bg-gray-900 hover:bg-gray-800 rounded-xl p-6 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Clock className="text-orange-400" size={24} />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold">{metrics.pendingRequests}</div>
              <h3 className="font-medium mb-1">Pending Requests</h3>
              <p className="text-sm text-gray-400">Awaiting approval</p>
            </div>
            <ArrowRight className="text-gray-400" size={20} />
          </div>
        </Link>

        {/* Total Views */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <TrendingUp className="text-cyan-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</div>
              <h3 className="font-medium mb-1">Total Views</h3>
              <p className="text-sm text-gray-400">All-time content views</p>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CreditCard className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
              <h3 className="font-medium mb-1">Active Subs</h3>
              <p className="text-sm text-gray-400">Current subscriptions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Recent Activity</h2>
          <Link 
            href="/featured"
            className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No recent activity
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'feature_request' ? 'bg-yellow-500/20' :
                    activity.type === 'creator_signup' ? 'bg-blue-500/20' :
                    'bg-green-500/20'
                  }`}>
                    {activity.type === 'feature_request' ? (
                      <Sparkles size={16} className="text-yellow-400" />
                    ) : activity.type === 'creator_signup' ? (
                      <Users size={16} className="text-blue-400" />
                    ) : (
                      <Shield size={16} className="text-green-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{activity.description}</div>
                    <div className="text-sm text-gray-400">by {activity.user_name}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(activity.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/featured" 
            className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded">
                <Sparkles className="text-yellow-400" size={20} />
              </div>
              <div>
                <div className="font-medium mb-1">Manage Featured</div>
                <div className="text-sm text-gray-400">{metrics.pendingRequests} pending requests</div>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/admin/creators" 
            className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded">
                <Users className="text-blue-400" size={20} />
              </div>
              <div>
                <div className="font-medium mb-1">Manage Creators</div>
                <div className="text-sm text-gray-400">View and manage all creators</div>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/admin/analytics" 
            className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded">
                <TrendingUp className="text-green-400" size={20} />
              </div>
              <div>
                <div className="font-medium mb-1">Analytics</div>
                <div className="text-sm text-gray-400">View platform analytics</div>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/admin/settings" 
            className="bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded">
                <Shield className="text-purple-400" size={20} />
              </div>
              <div>
                <div className="font-medium mb-1">Settings</div>
                <div className="text-sm text-gray-400">Platform configuration</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}