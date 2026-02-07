'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Image, Video, Star, AlertCircle, Zap, Clock, CheckCircle, XCircle, Loader2, Eye, Heart, Folder } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RequestFeatureButton from '@/components/portfolio/RequestFeatureButton'

interface PortfolioItem {
  id: string
  title: string
  media_count: number
  cover_media_url: string
  category: string
  view_count: number
  like_count: number
  save_count: number
  is_featured: boolean
  created_at: string
}

interface Subscription {
  id: string
  plan_type: string
  status: string
  featured_posts_included: number
  featured_posts_used: number
  expires_at: string
}

interface FeaturedRequest {
  id: string
  portfolio_item_id: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  requested_at: string
  reviewed_at?: string
  admin_notes?: string
  portfolio_items: {
    id: string
    title: string
    media_count: number
    category: string
  } // SINGLE object, not array
}

interface UserLimits {
  max_posts: number
  max_media: number
  posts_used: number
  media_used: number
  remaining_posts: number
  remaining_media: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [featuredRequests, setFeaturedRequests] = useState<FeaturedRequest[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [userLimits, setUserLimits] = useState<UserLimits>({
    max_posts: 3,
    max_media: 5,
    posts_used: 0,
    media_used: 0,
    remaining_posts: 3,
    remaining_media: 5
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalSaves: 0,
    featuredPosts: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    availableFeatureRequests: 0
  })

  useEffect(() => {
    // Redirect if no user (ProtectedRoute should handle, but double-check)
    if (!user) {
      router.push('/login')
      return
    }

    loadDashboardData()
  }, [user, router])

  async function loadDashboardData() {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      // First, ensure user has a profile
      await ensureUserProfile(user.id)

      // Load user limits - FIXED: Use what actually exists
      await loadUserLimits()

      // Get user's portfolio items
      const { data: items, error: itemsError } = await supabase
        .from('portfolio_items')
        .select('id, title, media_count, cover_media_url, category, view_count, like_count, save_count, is_featured, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Get featured requests
      const { data: requests, error: requestsError } = await supabase
        .from('featured_requests')
        .select(`
          id,
          portfolio_item_id,
          status,
          requested_at,
          reviewed_at,
          admin_notes,
          portfolio_items!featured_requests_portfolio_item_id_fkey (
            id,
            title,
            media_count,
            category
          )
        `)
        .eq('creator_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(5)

      if (requestsError) {
        // Fallback approach if constraint error
        await loadFeaturedRequestsFallback(items || [])
      } else {
        processRequests(requests || [], items || [])
      }

      // Get subscription
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (subError && subError.code !== 'PGRST116') {
      }

      setSubscription(sub)

      // Calculate stats
      const totalPosts = items?.length || 0
      const totalViews = items?.reduce((sum, item) => sum + item.view_count, 0) || 0
      const totalLikes = items?.reduce((sum, item) => sum + item.like_count, 0) || 0
      const totalSaves = items?.reduce((sum, item) => sum + item.save_count, 0) || 0
      const featuredPosts = items?.filter(item => item.is_featured).length || 0

      setPortfolioItems(items || [])
      setStats({
        totalPosts,
        totalViews,
        totalLikes,
        totalSaves,
        featuredPosts,
        pendingRequests: stats.pendingRequests,
        approvedRequests: stats.approvedRequests,
        availableFeatureRequests: sub 
          ? Math.max(0, sub.featured_posts_included - sub.featured_posts_used)
          : 0
      })
      
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserLimits() {
    try {
      // Get user's current plan from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, portfolio_limit, featured_requests_available')
        .eq('id', user!.id)
        .single()

      if (!profile) return

      // Get plan limits from subscription_plans table
      const planType = profile.subscription_tier || 'free'
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('max_posts, max_media')
        .eq('plan_type', planType)
        .single()

      // FIXED: Get posts_used and media_used from profile or calculate
      // If profile doesn't have these columns, calculate from portfolio items
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('id, media_count')
        .eq('creator_id', user!.id)
      
      const postsUsed = portfolioData?.length || 0
      const mediaUsed = portfolioData?.reduce((sum, item) => sum + item.media_count, 0) || 0

      // Use plan limits if available, otherwise use defaults
      const maxPosts = plan?.max_posts || 
                     (planType === 'premium' ? 10 : 
                      planType === 'pro' ? 25 : 3)
      const maxMedia = plan?.max_media || 
                      (planType === 'premium' ? 50 : 
                       planType === 'pro' ? 200 : 5)

      setUserLimits({
        max_posts: maxPosts,
        max_media: maxMedia,
        posts_used: postsUsed,
        media_used: mediaUsed,
        remaining_posts: Math.max(0, maxPosts - postsUsed),
        remaining_media: Math.max(0, maxMedia - mediaUsed)
      })
    } catch (error) {
      // Fallback to free plan limits
      setUserLimits({
        max_posts: 3,
        max_media: 5,
        posts_used: portfolioItems.length,
        media_used: portfolioItems.reduce((sum, item) => sum + item.media_count, 0),
        remaining_posts: Math.max(0, 3 - portfolioItems.length),
        remaining_media: Math.max(0, 5 - portfolioItems.reduce((sum, item) => sum + item.media_count, 0))
      })
    }
  }

  async function loadFeaturedRequestsFallback(items: PortfolioItem[]) {
    try {
      const { data: simpleRequests, error: simpleError } = await supabase
        .from('featured_requests')
        .select('*')
        .eq('creator_id', user!.id)
        .order('requested_at', { ascending: false })
        .limit(5)
      
      if (simpleError) throw simpleError
      
      const transformedRequests: FeaturedRequest[] = (simpleRequests || []).map(request => ({
        id: request.id,
        portfolio_item_id: request.portfolio_item_id,
        status: request.status,
        requested_at: request.requested_at,
        reviewed_at: request.reviewed_at,
        admin_notes: request.admin_notes,
        portfolio_items: items.find(item => item.id === request.portfolio_item_id) || {
          id: '',
          title: 'Unknown Item',
          media_count: 0,
          category: 'Unknown'
        }
      })).filter(r => r.portfolio_items.id) as FeaturedRequest[]
      
      processRequests(transformedRequests, items)
    } catch (error) {
    }
  }

  function processRequests(requests: any[], items: PortfolioItem[]) {
    const transformedRequests: FeaturedRequest[] = requests.map(request => {
      const portfolioItem = Array.isArray(request.portfolio_items) 
        ? request.portfolio_items[0]
        : request.portfolio_items
      
      return {
        id: request.id,
        portfolio_item_id: request.portfolio_item_id,
        status: request.status,
        requested_at: request.requested_at,
        reviewed_at: request.reviewed_at,
        admin_notes: request.admin_notes,
        portfolio_items: portfolioItem || {
          id: '',
          title: 'Unknown Item',
          media_count: 0,
          category: 'Unknown'
        }
      }
    }).filter(r => r.portfolio_items.id)

    const pendingRequests = transformedRequests.filter(r => r.status === 'pending').length
    const approvedRequests = transformedRequests.filter(r => r.status === 'approved').length

    setFeaturedRequests(transformedRequests)
    setStats(prev => ({
      ...prev,
      pendingRequests,
      approvedRequests
    }))
  }

  async function ensureUserProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user?.email || '',
            username: user?.email?.split('@')[0] || 'user',
            creator_type: 'photographer',
            // Only set columns that exist
            subscription_tier: 'free',
            portfolio_limit: 5,
            featured_requests_available: 0,
            is_premium: false,
            subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
          })
        
        if (createError) throw createError
      } else if (error) {
        throw error
      }
    } catch (error) {
    }
  }

  const handleRequestSubmitted = () => {
    loadDashboardData() // Refresh data
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Creator Dashboard</h1>
        <p className="text-gray-600">Manage your portfolio and track performance</p>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded">
              <Folder className="text-blue-700" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPosts}</div>
              <div className="text-sm text-gray-600">Total Posts</div>
              <div className="text-xs text-gray-500">
                {userLimits.posts_used}/{userLimits.max_posts} posts • {userLimits.media_used}/{userLimits.max_media} media
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded">
              <Eye className="text-green-700" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-100 rounded">
              <Heart className="text-pink-700" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Likes</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded">
              <Star className="text-yellow-700" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSaves.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Saves</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column: Featured Requests */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1 text-gray-900">Featured Requests</h2>
              <p className="text-gray-600 text-sm">
                Get priority placement for your best work
              </p>
            </div>
            {!subscription ? (
              <Link
                href="/subscription"
                className="px-4 py-2 bg-green-900 text-white hover:bg-green-800 rounded-lg font-medium"
              >
                <Star size={16} className="inline mr-2" />
                Get Premium
              </Link>
            ) : stats.availableFeatureRequests === 0 ? (
              <Link
                href="/subscription"
                className="px-4 py-2 bg-green-800 text-white hover:bg-green-700 rounded-lg font-medium"
              >
                <Zap size={16} className="inline mr-2" />
                Upgrade Plan
              </Link>
            ) : (
              <div className="text-sm text-gray-600">
                {stats.availableFeatureRequests} requests available
              </div>
            )}
          </div>

          {/* Active requests list */}
          {featuredRequests.length > 0 ? (
            <div className="space-y-3 mb-6">
              <h3 className="font-medium text-gray-900">Recent Requests</h3>
              {featuredRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${
                      request.status === 'pending' ? 'bg-yellow-100' :
                      request.status === 'approved' ? 'bg-green-100' :
                      'bg-red-100'
                    }`}>
                      {request.status === 'pending' ? (
                        <Clock size={16} className="text-yellow-700" />
                      ) : request.status === 'approved' ? (
                        <CheckCircle size={16} className="text-green-700" />
                      ) : (
                        <XCircle size={16} className="text-red-700" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {request.portfolio_items?.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)} • 
                        {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
              <Star className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <div className="text-gray-600 mb-1">No featured requests yet</div>
              <p className="text-sm text-gray-500">
                Submit your best work for featured placement
              </p>
            </div>
          )}

          {/* Available items for featuring */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-900 mb-3">Request Feature for Recent Posts</h3>
            {portfolioItems.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-600 mb-2">No portfolio posts yet</div>
                <Link 
                  href="/upload" 
                  className="text-green-800 hover:text-green-700 text-sm font-medium"
                >
                  Upload your first portfolio post →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolioItems
                  .filter(item => !item.is_featured)
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                          {item.cover_media_url ? (
                            <img 
                              src={item.cover_media_url} 
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Image className="h-full w-full p-2 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">{item.title || 'Untitled'}</div>
                          <div className="text-xs text-gray-600">
                            {item.category} • {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <RequestFeatureButton
                        itemId={item.id}
                        itemTitle={item.title}
                        creatorId={user!.id}
                        isFeatured={item.is_featured}
                        onSuccess={handleRequestSubmitted}
                      />
                    </div>
                  ))
                }
              </div>
            )}

            {portfolioItems.length > 3 && (
              <div className="mt-4 text-center">
                <Link 
                  href="/portfolio" 
                  className="text-green-800 hover:text-green-700 text-sm font-medium"
                >
                  View all {portfolioItems.length} posts →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Uploads & Actions */}
        <div>
          {/* Quick actions */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <Link
                href="/upload"
                className="px-4 py-2 bg-green-900 text-white font-medium rounded-lg hover:bg-green-800 transition-colors"
              >
                Upload New Post
              </Link>
            </div>
            
            {userLimits.remaining_posts === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-700" />
                  <div>
                    <div className="font-medium text-gray-900">Post Limit Reached</div>
                    <div className="text-sm text-gray-700">
                      You've reached your limit of {userLimits.max_posts} posts. 
                      {subscription ? ' Consider upgrading your plan.' : ' Upgrade to premium for more posts.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Limits display */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h3 className="font-medium mb-3 text-gray-900">Your Limits</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Posts</span>
                    <span className="text-gray-900">{userLimits.posts_used}/{userLimits.max_posts}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600" 
                      style={{ width: `${Math.min(100, (userLimits.posts_used / userLimits.max_posts) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Media Files</span>
                    <span className="text-gray-900">{userLimits.media_used}/{userLimits.max_media}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600" 
                      style={{ width: `${Math.min(100, (userLimits.media_used / userLimits.max_media) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/portfolio"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
              >
                <Folder className="h-8 w-8 text-blue-700 mx-auto mb-2" />
                <div className="font-medium text-gray-900">My Portfolio</div>
                <div className="text-xs text-gray-600">{stats.totalPosts} posts</div>
              </Link>
              
              <Link
                href="/subscription"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors border border-gray-200"
              >
                <Zap className="h-8 w-8 text-green-700 mx-auto mb-2" />
                <div className="font-medium text-gray-900">Subscription</div>
                <div className="text-xs text-gray-600">
                  {subscription ? subscription.plan_type.toUpperCase() : 'Free'}
                </div>
              </Link>
            </div>
          </div>

          {/* Recent uploads */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Posts</h2>
            {portfolioItems.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-gray-600 mb-2">No portfolio posts yet</div>
                <p className="text-sm text-gray-500 mb-4">Start by uploading your first portfolio post</p>
                <Link
                  href="/upload"
                  className="inline-block px-4 py-2 bg-green-900 text-white font-medium rounded-lg hover:bg-green-800 transition-colors"
                >
                  Upload First Post
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolioItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                        {item.cover_media_url ? (
                          <img 
                            src={item.cover_media_url} 
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image className="h-full w-full p-2 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{item.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-600">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.is_featured && (
                        <Star size={14} className="text-yellow-600" />
                      )}
                      <div className="text-right">
                        <div className="text-xs text-gray-900">{item.view_count} views</div>
                        <div className="text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Heart size={10} />
                            <span>{item.like_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}