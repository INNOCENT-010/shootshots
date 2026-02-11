// app/(creator)/portfolio/page.tsx - Creator Portfolio Management Page
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  Edit, Trash2, Eye, Plus, Image as ImageIcon, 
  Video, Folder, Calendar, Grid, MoreVertical,
  ChevronRight, Upload, Star, Download, Share2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  is_featured: boolean
  view_count: number
  like_count: number
  save_count: number
  created_at: string
  media_count: number
  cover_media_url: string
}

export default function CreatorPortfolioPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalSaves: 0,
    featuredPosts: 0
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadPortfolioItems()
  }, [user, router])

  const loadPortfolioItems = async () => {
    try {
      const { data: items, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPortfolioItems(items || [])
      
      // Calculate stats
      const totalPosts = items?.length || 0
      const totalViews = items?.reduce((sum, item) => sum + item.view_count, 0) || 0
      const totalLikes = items?.reduce((sum, item) => sum + item.like_count, 0) || 0
      const totalSaves = items?.reduce((sum, item) => sum + item.save_count, 0) || 0
      const featuredPosts = items?.filter(item => item.is_featured).length || 0

      setStats({
        totalPosts,
        totalViews,
        totalLikes,
        totalSaves,
        featuredPosts
      })
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return

    setDeletingId(itemId)
    try {
      // First, delete associated media
      const { error: mediaError } = await supabase
        .from('portfolio_media')
        .delete()
        .eq('portfolio_item_id', itemId)

      if (mediaError) throw mediaError

      // Then delete the portfolio item
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId)
        .eq('creator_id', user!.id)

      if (error) throw error

      // Remove from state
      setPortfolioItems(items => items.filter(item => item.id !== itemId))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalPosts: prev.totalPosts - 1
      }))
    } catch (error) {
      alert('Failed to delete portfolio item')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="text-gray-600">Loading portfolio...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Portfolio</h1>
              <p className="text-gray-600">Manage your portfolio posts and view performance</p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus size={18} />
              <span className="font-medium">New Portfolio Post</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Posts</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPosts}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Views</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Likes</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Featured Posts</div>
              <div className="text-2xl font-bold text-gray-900">{stats.featuredPosts}</div>
            </div>
          </div>
        </div>

        {/* Portfolio Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {portfolioItems.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolio posts yet</h3>
              <p className="text-gray-600 mb-6">Start by uploading your first portfolio post</p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors"
              >
                <Plus size={18} />
                <span className="font-medium">Create First Post</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                <div className="col-span-5">Post</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-center">Views</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Portfolio Items List */}
              <div className="divide-y divide-gray-200">
                {portfolioItems.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="md:hidden mb-4">
                      {/* Mobile View */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                          {item.cover_media_url ? (
                            <img
                              src={item.cover_media_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={20} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                                {item.title || 'Untitled Post'}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  {item.category}
                                </span>
                                {item.is_featured && (
                                  <span className="flex items-center gap-1 text-xs text-green-700">
                                    <Star size={12} />
                                    Featured
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Eye size={14} />
                            <span>{item.view_count}</span>
                          </div>
                          <div>{formatDate(item.created_at)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/portfolio/${item.id}`}
                            className="p-1.5 text-gray-600 hover:text-gray-900"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/portfolio/edit/${item.id}`}
                            className="p-1.5 text-gray-600 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                            {item.cover_media_url ? (
                              <img
                                src={item.cover_media_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon size={16} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                              {item.title || 'Untitled Post'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Grid size={12} />
                                {item.media_count} media
                              </span>
                              {item.is_featured && (
                                <span className="flex items-center gap-1 text-xs text-green-700">
                                  <Star size={12} />
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-gray-700">{item.category}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar size={14} />
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-700">
                          <Eye size={14} />
                          {item.view_count}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/portfolio/${item.id}`}
                            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            href={`/portfolio/edit/${item.id}`}
                            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Tips */}
        {portfolioItems.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-3">Portfolio Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Keep your portfolio updated with your best recent work</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Use clear titles and descriptions for better discovery</span>
              </li>
        
              <li className="flex items-start gap-2">
                <ChevronRight size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Share your portfolio posts on social media to increase visibility</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}