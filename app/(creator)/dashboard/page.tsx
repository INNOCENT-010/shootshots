// app/(creator)/dashboard/page.tsx - WITH VIDEO PREVIEW SUPPORT
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Eye, Heart, Folder, Copy, Check, Image, Plus, ExternalLink, Link as LinkIcon, Film, Play } from 'lucide-react'
import Link from 'next/link'
import VideoPreview from '@/components/common/VideoPreview'

interface PortfolioItem {
  id: string
  title: string
  cover_media_url: string
  category: string
  view_count: number
  like_count: number
  created_at: string
  // Add media_type to portfolio items query
  portfolio_media?: {
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [portfolioLink, setPortfolioLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0
  })

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push('/login')
        return
      }
      
      setUser(session.user)
      
      // Generate portfolio link
      const link = `${window.location.origin}/creator/${session.user.id}`
      setPortfolioLink(link)
      
      // Load portfolio data
      await loadPortfolioData(session.user.id)
      
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function loadPortfolioData(userId: string) {
    try {
      // Get portfolio items WITH media type to detect videos
      const { data: items, error } = await supabase
        .from('portfolio_items')
        .select(`
          id, 
          title, 
          cover_media_url, 
          category, 
          view_count, 
          like_count, 
          created_at,
          portfolio_media (
            media_type,
            display_order
          )
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPortfolioItems(items || [])
      
      // Calculate stats
      const totalPosts = items?.length || 0
      const totalViews = items?.reduce((sum, item) => sum + item.view_count, 0) || 0
      const totalLikes = items?.reduce((sum, item) => sum + item.like_count, 0) || 0

      setStats({
        totalPosts,
        totalViews,
        totalLikes
      })
      
    } catch (error) {
    }
  }

  const copyPortfolioLink = () => {
    if (portfolioLink) {
      navigator.clipboard.writeText(portfolioLink)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(err => {
        })
    }
  }

  // Helper function to check if item has videos
  const hasVideo = (item: PortfolioItem) => {
    return item.portfolio_media?.some(media => media.media_type === 'video' && media.display_order === 0) || false
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-gray-800 border-r-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Your Portfolio</h1>
          <p className="text-gray-600 text-sm">Manage and share your work</p>
        </div>

        {/* Portfolio Link Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="text-gray-900" size={20} />
                <h2 className="text-lg font-medium text-gray-900">Your Portfolio Link</h2>
              </div>
              <p className="text-gray-600 text-sm mb-4 md:mb-0">
                Share this link with clients to view your portfolio
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 overflow-x-auto">
                  <code className="text-sm text-gray-900 whitespace-nowrap">
                    {portfolioLink}
                  </code>
                </div>
              </div>
              <button
                onClick={copyPortfolioLink}
                className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portfolio Items</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPosts}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Folder className="text-gray-700" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Eye className="text-gray-700" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Heart className="text-gray-700" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload & Actions */}
          <div className="lg:col-span-1">
            {/* Upload Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Upload className="text-gray-900" size={20} />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Upload New Work</h2>
              </div>
              
              <Link
                href="/upload"
                className="block w-full p-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-center mb-4"
              >
                <Plus className="inline mr-2" size={18} />
                Upload New Portfolio Item
              </Link>
              
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Camera size={12} />
                  <span>Images</span>
                </div>
                <div className="flex items-center gap-1">
                  <Film size={12} />
                  <span>Videos</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/portfolio"
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded">
                    <Folder className="text-gray-700" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">View Portfolio</div>
                    <div className="text-xs text-gray-600">See all your work</div>
                  </div>
                </Link>
                
                <Link
                  href={`/creator/${user?.id}`}
                  target="_blank"
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded">
                    <ExternalLink className="text-gray-700" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Preview Public Portfolio </div>
                    <div className="text-xs text-gray-600">See how clients view it</div>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded">
                    <Camera className="text-gray-700" size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Edit Profile</div>
                    <div className="text-xs text-gray-600">Update your info & rates</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Portfolio Items */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Image className="text-gray-900" size={20} />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">Recent Portfolio Items</h2>
                </div>
                {portfolioItems.length > 0 && (
                  <Link
                    href="/portfolio"
                    className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                  >
                    View all →
                  </Link>
                )}
              </div>

              {portfolioItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolio items yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start building your portfolio by uploading your best work. 
                    Show clients what you can do.
                  </p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Upload size={16} />
                    Upload Your First Work
                  </Link>
                </div>
              ) : (
                <>
                  {/* Grid view for portfolio items WITH VIDEO SUPPORT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {portfolioItems.slice(0, 4).map((item) => {
                      const isVideo = hasVideo(item);
                      
                      return (
                        <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-gray-100 overflow-hidden relative">
                            {item.cover_media_url ? (
                              isVideo ? (
                                <div className="w-full h-full relative">
                                  <VideoPreview
                                    src={item.cover_media_url}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                                    <div className="bg-black/70 rounded-full p-3">
                                      <Play size={20} className="text-white fill-white" />
                                    </div>
                                  </div>
                                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <Film size={12} />
                                    <span>Video</span>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={item.cover_media_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="text-gray-400" size={32} />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-900 truncate">
                                {item.title || 'Untitled'}
                              </h3>
                              <div className="flex items-center gap-1">
                                {isVideo && (
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Film size={10} />
                                    Video
                                  </span>
                                )}
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Eye size={12} />
                                  <span>{item.view_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart size={12} />
                                  <span>{item.like_count}</span>
                                </div>
                              </div>
                              <Link
                                href={`/portfolio/${item.id}`}
                                className="text-gray-900 hover:text-gray-700 text-xs font-medium"
                              >
                                View →
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {portfolioItems.length > 4 && (
                    <div className="border-t border-gray-200 pt-6">
                      <div className="text-center">
                        <Link
                          href="/portfolio"
                          className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View All {portfolioItems.length} Portfolio Items
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}