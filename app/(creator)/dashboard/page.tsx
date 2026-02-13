// app/(creator)/dashboard/page.tsx - UPDATED WITH VIDEO PREVIEW
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Eye, Heart, Folder, Copy, Check, Image, Plus, ExternalLink, Link as LinkIcon, Film, Play } from 'lucide-react'
import Link from 'next/link'
import VideoPreview from '@/components/common/VideoPreview' // ← ADDED THIS IMPORT

interface PortfolioItem {
  id: string
  title: string
  cover_media_url: string
  category: string
  view_count: number
  like_count: number
  created_at: string
  portfolio_media?: {
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

interface UserProfile {
  id: string
  slug: string
  display_name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
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
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, slug, display_name')
        .eq('id', session.user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        const link = `${window.location.origin}/${profileData.slug}`
        setPortfolioLink(link)
      }
      
      await loadPortfolioData(session.user.id)
      
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function loadPortfolioData(userId: string) {
    try {
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
      
      const totalPosts = items?.length || 0
      const totalViews = items?.reduce((sum, item) => sum + item.view_count, 0) || 0
      const totalLikes = items?.reduce((sum, item) => sum + item.like_count, 0) || 0

      setStats({
        totalPosts,
        totalViews,
        totalLikes
      })
      
    } catch (error) {}
  }

  const copyPortfolioLink = () => {
    if (portfolioLink) {
      navigator.clipboard.writeText(portfolioLink)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(err => {})
    }
  }

  const hasVideo = (item: PortfolioItem) => {
    return item.portfolio_media?.some(media => media.media_type === 'video' && media.display_order === 0) || false
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="h-8 w-8 border-2 border-gray-800 border-r-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Portfolio</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and share your work</p>
          </div>
        </div>

        {/* Portfolio Link Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <LinkIcon className="text-gray-500 flex-shrink-0" size={18} />
              <code className="text-sm text-gray-900 truncate block font-mono">
                {portfolioLink}
              </code>
            </div>
            <button
              onClick={copyPortfolioLink}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
          <p className="text-xs text-gray-500 mt-2">
            Your permanent portfolio URL: <span className="font-mono">{profile?.slug ? `/${profile.slug}` : ''}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Items</p>
            <p className="text-xl font-semibold text-gray-900">{stats.totalPosts}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Views</p>
            <p className="text-xl font-semibold text-gray-900">{stats.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Likes</p>
            <p className="text-xl font-semibold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
          </div>
        </div>

        {/* Upload Button */}
        <Link
          href="/upload"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors mb-6"
        >
          <Plus size={18} />
          <span className="font-medium">Upload New Portfolio Item</span>
        </Link>

        {/* Quick Actions & Portfolio Items */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Quick Actions */}
          <div className="lg:w-64">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              <Link
                href="/portfolio"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 lg:w-full"
              >
                <Folder size={16} className="text-gray-700" />
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Edit Portfolio</span>
              </Link>
              
              <Link
                href={`/${profile?.slug || user?.id}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 lg:w-full"
              >
                <ExternalLink size={16} className="text-gray-700" />
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Preview</span>
              </Link>
              
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 lg:w-full"
              >
                <Camera size={16} className="text-gray-700" />
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Edit Profile</span>
              </Link>
            </div>
          </div>

          {/* Portfolio Items */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Recent Portfolio Items</h3>
              {portfolioItems.length > 0 && (
                <Link href="/portfolio" className="text-sm text-gray-900 hover:text-gray-700 font-medium">
                  View all
                </Link>
              )}
            </div>

            {portfolioItems.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <Camera size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 text-sm">No items yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {portfolioItems.slice(0, 4).map((item) => {
                  const isVideo = hasVideo(item);
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="aspect-square bg-gray-100 relative">
                        {item.cover_media_url ? (
                          isVideo ? (
                            // ===== FIXED: Using VideoPreview component =====
                            <VideoPreview
                              src={item.cover_media_url}
                              poster={item.cover_media_url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.cover_media_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera size={24} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-xs font-medium text-gray-900 truncate">
                          {item.title || 'Untitled'}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <Eye size={10} className="text-gray-500" />
                              <span className="text-xs text-gray-600">{item.view_count}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Heart size={10} className="text-gray-500" />
                              <span className="text-xs text-gray-600">{item.like_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}