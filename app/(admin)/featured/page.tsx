// app/(admin)/featured/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Star, Search, Filter, Check, X, Eye, Calendar, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PortfolioItem {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  title?: string
  description?: string
  category: string
  is_featured: boolean
  featured_at: string | null
  view_count: number
  like_count: number
  save_count: number
  created_at: string
  creator_id: string
  profiles: {
    id: string
    display_name: string
    location?: string
    creator_type?: string
  }
}

export default function AdminFeaturedPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [filteredItems, setFilteredItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'featured' | 'not_featured'>('all')
  const [user, setUser] = useState<any>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadPortfolioItems()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filter, items])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      router.push('/login?redirect=/admin/featured')
      return
    }
    
    // Check if user is admin (you can customize this check)
    const isAdmin = session.user.email?.endsWith('@admin.com') // Change this
    if (!isAdmin) {
      router.push('/')
      return
    }
    
    setUser(session.user)
  }

  async function loadPortfolioItems() {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles!portfolio_items_creator_id_fkey(
            id,
            display_name,
            location,
            creator_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      
      const itemsWithFeatured = data?.map(item => ({
        ...item,
        featured_at: item.featured_at || null
      })) || []
      
      setItems(itemsWithFeatured)
      setFilteredItems(itemsWithFeatured)
    } catch (error) {
      console.error('Error loading portfolio items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFeatured(itemId: string, currentlyFeatured: boolean) {
    if (processingId) return
    
    setProcessingId(itemId)
    try {
      const { data, error } = await supabase.rpc('toggle_featured_item', {
        p_item_id: itemId,
        p_featured: !currentlyFeatured
      })
      
      if (error) throw error
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              is_featured: !currentlyFeatured,
              featured_at: !currentlyFeatured ? new Date().toISOString() : null
            } 
          : item
      ))
    } catch (error) {
      console.error('Error toggling featured:', error)
    } finally {
      setProcessingId(null)
    }
  }

  function applyFilters() {
    let result = [...items]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.profiles.display_name?.toLowerCase().includes(query)
      )
    }

    // Apply featured filter
    if (filter === 'featured') {
      result = result.filter(item => item.is_featured)
    } else if (filter === 'not_featured') {
      result = result.filter(item => !item.is_featured)
    }

    setFilteredItems(result)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="text-yellow-500" size={24} />
                Featured Content Management
              </h1>
              <p className="text-gray-400 text-sm">
                {filteredItems.length} items • {items.filter(i => i.is_featured).length} featured
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-sm text-gray-300 hover:text-white"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, creator, category..."
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-white"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('featured')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'featured' ? 'bg-yellow-900/30 text-yellow-400' : 'hover:bg-gray-800'}`}
              >
                <Star size={14} className="inline mr-2" />
                Featured
              </button>
              <button
                onClick={() => setFilter('not_featured')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'not_featured' ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
              >
                Not Featured
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold">{items.length}</div>
              <div className="text-sm text-gray-400">Total Items</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{items.filter(i => i.is_featured).length}</div>
              <div className="text-sm text-gray-400">Featured Items</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold">{Math.round((items.filter(i => i.is_featured).length / items.length) * 100) || 0}%</div>
              <div className="text-sm text-gray-400">Featured Rate</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold">
                {items.filter(i => i.is_featured)
                  .sort((a, b) => new Date(b.featured_at || 0).getTime() - new Date(a.featured_at || 0).getTime())[0]?.featured_at 
                  ? new Date(items.filter(i => i.is_featured)
                    .sort((a, b) => new Date(b.featured_at || 0).getTime() - new Date(a.featured_at || 0).getTime())[0].featured_at!)
                    .toLocaleDateString()
                  : 'None'
                }
              </div>
              <div className="text-sm text-gray-400">Last Featured</div>
            </div>
          </div>
        </div>

        {/* Portfolio Items Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Item</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Creator</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Stats</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Featured</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                            {item.media_type === 'image' ? (
                              <img
                                src={item.media_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <div className="text-xs">VIDEO</div>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm line-clamp-1">
                              {item.title || 'Untitled'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <User size={12} />
                          </div>
                          <div className="text-sm">{item.profiles.display_name}</div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Eye size={10} className="text-gray-400" />
                            <span>{item.view_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={10} className="text-red-400" />
                            <span>{item.like_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={10} className="text-blue-400" />
                            <span>{item.save_count}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4 text-sm text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${item.is_featured ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                          <Star size={12} className={item.is_featured ? 'fill-current' : ''} />
                          {item.is_featured ? 'Featured' : 'Not Featured'}
                          {item.featured_at && (
                            <div className="text-[10px] opacity-75">
                              {new Date(item.featured_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFeatured(item.id, item.is_featured)}
                            disabled={processingId === item.id}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${item.is_featured 
                              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                              : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                            } disabled:opacity-50`}
                          >
                            {processingId === item.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : item.is_featured ? (
                              <>
                                <X size={14} className="inline mr-1" />
                                Unfeature
                              </>
                            ) : (
                              <>
                                <Star size={14} className="inline mr-1" />
                                Feature
                              </>
                            )}
                          </button>
                          
                          <Link
                            href={`/creator/${item.profiles.id}`}
                            className="px-3 py-1.5 rounded text-sm font-medium bg-gray-800 hover:bg-gray-700"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Featured Guidelines */}
        <div className="mt-8 bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Star className="text-yellow-500" size={20} />
            Featured Content Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                <span>High-quality, professional work</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                <span>Good engagement (likes, saves, views)</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                <span>Complete profile information</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                <span>Diverse content (mix of categories)</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt=0.5 flex-shrink-0" size={16} />
                <span>Regularly updated portfolio</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-500 mt=0.5 flex-shrink-0" size={16} />
                <span>Positive community feedback</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}