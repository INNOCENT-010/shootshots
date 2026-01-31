'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Image, Video, Star, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PortfolioItem {
  id: string
  title: string
  media_type: 'image' | 'video'
  category: string
  view_count: number
  save_count: number
  is_featured: boolean
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalItems: 0,
    totalViews: 0,
    totalSaves: 0,
    featuredItems: 0,
    remainingUploads: 5
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
      // Get user's portfolio items
      const { data: items, error: itemsError } = await supabase
        .from('portfolio_items')
        .select('id, title, media_type, category, view_count, save_count, is_featured, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Get user's profile to check limits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_premium, portfolio_limit')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') { // Ignore "no rows returned" error
        throw profileError
      }

      const totalItems = items?.length || 0
      const totalViews = items?.reduce((sum, item) => sum + item.view_count, 0) || 0
      const totalSaves = items?.reduce((sum, item) => sum + item.save_count, 0) || 0
      const featuredItems = items?.filter(item => item.is_featured).length || 0
      
      const maxLimit = profile?.portfolio_limit || 5
      const remainingUploads = Math.max(0, maxLimit - totalItems)

      setPortfolioItems(items || [])
      setStats({
        totalItems,
        totalViews,
        totalSaves,
        featuredItems,
        remainingUploads
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Creator Dashboard</h1>
        <p className="text-gray-400">Manage your portfolio and track performance</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded">
              <Image className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <div className="text-sm text-gray-400">Portfolio Items</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded">
              <Video className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <div className="text-sm text-gray-400">Total Views</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded">
              <Star className="text-yellow-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalSaves}</div>
              <div className="text-sm text-gray-400">Total Saves</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded">
              <AlertCircle className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.remainingUploads}</div>
              <div className="text-sm text-gray-400">Uploads Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <Link
            href="/dashboard/upload"
            className="px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Upload New Item
          </Link>
        </div>
        
        {stats.remainingUploads === 0 && stats.totalItems >= 5 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-yellow-400" />
              <div>
                <div className="font-medium">Upload Limit Reached</div>
                <div className="text-sm text-gray-300">
                  You've reached your free limit of 5 items. Upgrade to premium for unlimited uploads.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent uploads */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
        {portfolioItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-lg">
            <div className="text-gray-400 mb-2">No portfolio items yet</div>
            <p className="text-sm text-gray-500">Start by uploading your first portfolio item</p>
            <Link
              href="/dashboard/upload"
              className="inline-block mt-4 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Upload First Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioItems.slice(0, 6).map((item) => (
              <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.media_type === 'image' ? (
                        <Image size={16} className="text-blue-400" />
                      ) : (
                        <Video size={16} className="text-green-400" />
                      )}
                      <span className="text-sm font-medium">{item.title || 'Untitled'}</span>
                    </div>
                    {item.is_featured && (
                      <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{item.category}</div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{item.view_count} views</span>
                    <span>{item.save_count} saves</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}