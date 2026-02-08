'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import VideoPreview from '@/components/common/VideoPreview'
import Link from 'next/link'
import { Star, Heart, MessageCircle, Share2, User, Grid, Copy, Twitter, MessageCircle as WhatsAppIcon, Facebook, Check, RefreshCw, ArrowDown, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import LikeSaveButtons from '@/components/interactions/LikeSaveButtons'
import { trackView } from '@/lib/utils/viewTracker'
import { feedCache } from '@/lib/FeedCache'

interface FeedItem {
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
  profiles?: {
    id: string
    display_name: string
    location?: string
    profile_image_url?: string
    creator_type?: string
  }
  portfolio_media: {
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

interface Filters {
  location: string
  creatorType: string
  mediaType: string
}

interface HomeFeedProps {
  filters: Filters
}

// ALGORITHMIC SHUFFLE FUNCTION
function shuffleWithWeights(items: FeedItem[], seed: number): FeedItem[] {
  if (!items.length) return []
  
  const shuffled = [...items]
  const random = () => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }
  
  const weightedItems = shuffled.map(item => {
    let weight = 1.0
    
    if (item.is_featured) weight *= 1.8
    
    const engagementScore = ((item.view_count * 0.3) + (item.like_count * 0.5) + (item.save_count * 0.2)) / 100
    weight *= (1 + Math.min(engagementScore, 2))
    
    const daysOld = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysOld < 1) weight *= 1.5
    else if (daysOld < 3) weight *= 1.3
    else if (daysOld < 7) weight *= 1.2
    else if (daysOld > 30) weight *= 0.8
    
    if (item.profiles?.creator_type?.toLowerCase().includes('video')) weight *= 1.1
    
    return { item, weight }
  })
  
  for (let i = weightedItems.length - 1; i > 0; i--) {
    const currentWeight = weightedItems[i].weight
    const j = Math.floor(random() * (i + 1) * currentWeight)
    const swapIndex = Math.min(j, i)
    ;[weightedItems[i], weightedItems[swapIndex]] = [weightedItems[swapIndex], weightedItems[i]]
  }
  
  return weightedItems.map(w => w.item)
}

// CONTENT VARIETY FUNCTION
function ensureContentVariety(items: FeedItem[]): FeedItem[] {
  if (items.length <= 10) return items
  
  const categories = new Map()
  const result = []
  const remaining = []
  
  for (const item of items) {
    const category = item.category || 'Uncategorized'
    if (!categories.has(category)) {
      categories.set(category, true)
      result.push(item)
    } else {
      remaining.push(item)
    }
  }
  
  const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5)
  const categoryBuckets = new Map()
  
  for (const item of [...result, ...shuffledRemaining]) {
    const category = item.category || 'Uncategorized'
    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(category, [])
    }
    categoryBuckets.get(category).push(item)
  }
  
  const finalResult = []
  let index = 0
  let hasItems = true
  
  while (hasItems) {
    hasItems = false
    for (const [, bucket] of categoryBuckets.entries()) {
      if (bucket[index]) {
        finalResult.push(bucket[index])
        hasItems = true
      }
    }
    index++
  }
  
  return finalResult.slice(0, 30)
}

export default function HomeFeed({ filters }: HomeFeedProps) {
  const router = useRouter()
  
  // State
  const [items, setItems] = useState<FeedItem[]>([])
  const [sessionSeed, setSessionSeed] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewCountUpdates, setViewCountUpdates] = useState<Record<string, number>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [pullToRefresh, setPullToRefresh] = useState({
    isPulling: false,
    startY: 0,
    distance: 0,
    threshold: 60
  })
  
  const shareMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const feedRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)

  // CHECK CACHE ON MOUNT
  useEffect(() => {
    if (hasLoadedRef.current) return
    
    const cacheKey = `homeFeed_${JSON.stringify(filters)}`
    const cachedData = feedCache.get<FeedItem[]>(cacheKey)
    
    if (cachedData) {
      setItems(cachedData.data)
      setSessionSeed(cachedData.seed)
      hasLoadedRef.current = true
    } else {
      const seed = Math.floor(Math.random() * 10000)
      setSessionSeed(seed)
      loadFeedItems(seed)
      hasLoadedRef.current = true
    }
  }, [])

  // PULL-TO-REFRESH
  useEffect(() => {
    let startY = 0
    let distance = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        setPullToRefresh(prev => ({ ...prev, isPulling: true, startY }))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullToRefresh.isPulling) return
      
      const currentY = e.touches[0].clientY
      distance = Math.max(0, currentY - startY)
      
      setPullToRefresh(prev => ({ ...prev, distance }))
      
      if (distance > 10) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (pullToRefresh.isPulling && pullToRefresh.distance > pullToRefresh.threshold) {
        refreshFeed()
      }
      
      setPullToRefresh({
        isPulling: false,
        startY: 0,
        distance: 0,
        threshold: 60
      })
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullToRefresh.isPulling])

  // LOAD FEED ITEMS
  async function loadFeedItems(seed: number) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles!portfolio_items_creator_id_fkey(
            id,
            display_name,
            location,
            profile_image_url,
            creator_type  
          ),
          portfolio_media (
            media_url,
            media_type,
            display_order
          )
        `)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      
      const shuffledItems = shuffleWithWeights(data || [], seed)
      const variedItems = ensureContentVariety(shuffledItems)
      
      setItems(variedItems)
      
      const cacheKey = `homeFeed_${JSON.stringify(filters)}`
      feedCache.set(cacheKey, variedItems, seed)
      
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  // REFRESH FEED
  async function refreshFeed() {
    setIsRefreshing(true)
    const newSeed = Math.floor(Math.random() * 10000)
    setSessionSeed(newSeed)
    
    const cacheKey = `homeFeed_${JSON.stringify(filters)}`
    feedCache.clear(cacheKey)
    
    await loadFeedItems(newSeed)
    setIsRefreshing(false)
  }

  // FILTERED ITEMS - Use useMemo
  const filteredItems = useMemo(() => {
    let result = [...items]

    if (filters.location !== 'All') {
      result = result.filter(item => 
        item.profiles?.location === filters.location
      )
    }

    if (filters.creatorType !== 'All') {
      const creatorTypeMap: Record<string, string> = {
        'Photo': 'photographer',
        'Video': 'videographer',
        'Mobile': 'mobile'
      }
      
      let targetType: string
      if (filters.creatorType in creatorTypeMap) {
        targetType = creatorTypeMap[filters.creatorType]
      } else {
        targetType = filters.creatorType.toLowerCase()
      }
      
      result = result.filter(item => {
        const creatorType = item.profiles?.creator_type?.toLowerCase() || ''
        return creatorType.includes(targetType)
      })
    }

    if (filters.mediaType !== 'All') {
      const mediaTypeMap: Record<string, string> = {
        'Images': 'image',
        'Videos': 'video'
      }
      
      let targetMedia: string
      if (filters.mediaType in mediaTypeMap) {
        targetMedia = mediaTypeMap[filters.mediaType]
      } else {
        targetMedia = filters.mediaType.toLowerCase()
      }
      
      result = result.filter(item => 
        item.portfolio_media?.some(media => media.media_type === targetMedia)
      )
    }

    return result
  }, [items, filters])

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-600">Loading feed...</div>
      </div>
    )
  }

  return (
    <div className="w-full px-2 py-3" ref={feedRef}>
      {/* PULL-TO-REFRESH INDICATOR - UPDATED: Changed from fixed to relative positioning */}
      {pullToRefresh.isPulling && pullToRefresh.distance > 0 && (
        <div 
          className="relative z-40 flex justify-center mb-2 transition-all duration-200"
          style={{
            transform: `translateY(${Math.min(pullToRefresh.distance, 80)}px)`,
            opacity: Math.min(pullToRefresh.distance / pullToRefresh.threshold, 1)
          }}
        >
          <div className="bg-green-900 text-white border border-green-700 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <ArrowDown 
              size={16} 
              className={`transition-transform ${pullToRefresh.distance > pullToRefresh.threshold ? 'rotate-180' : ''}`}
            />
            <span className="text-sm">
              {pullToRefresh.distance > pullToRefresh.threshold ? 'Release to refresh' : 'Pull down to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg z-50 flex items-center gap-2 ${
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white text-sm shadow-lg animate-in slide-in-from-right-5`}>
          {toastType === 'success' ? (
            <Check size={16} className="text-white" />
          ) : null}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FEED CONTROLS */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-xs text-gray-600">
          {items.length > 0 ? (
            <>
              Showing {filteredItems.length} of {items.length} posts
              {(filters.location !== 'All' || filters.creatorType !== 'All' || filters.mediaType !== 'All') && (
                <span className="ml-2">
                  • Filtered by: 
                  {filters.location !== 'All' && ` ${filters.location}`}
                  {filters.creatorType !== 'All' && ` • ${filters.creatorType}`}
                  {filters.mediaType !== 'All' && ` • ${filters.mediaType}`}
                </span>
              )}
            </>
          ) : (
            'No posts to show'
          )}
        </div>
        
        <button
          onClick={refreshFeed}
          disabled={isRefreshing}
          className="text-xs bg-green-900 text-white hover:bg-green-800 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Feed'}
        </button>
      </div>

      {/* MASONRY GRID - UPDATED: Removed space-y-3 to fix mobile scrolling */}
      {filteredItems.length > 0 ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3">
          {filteredItems.map((item, index) => {
            const coverMedia = item.portfolio_media?.find(m => m.display_order === 0) || 
                             item.portfolio_media?.[0]
            const hasMultipleMedia = item.media_count > 1
            const displayViewCount = (viewCountUpdates[item.id] || 0) + item.view_count
            
            return (
              <div
                key={`${item.id}-${index}-${sessionSeed}`}
                className="break-inside-avoid mb-3"
              >
                <div 
                  className="bg-white rounded-lg overflow-hidden hover:opacity-95 transition-opacity cursor-pointer border border-gray-200 shadow-sm hover:shadow-md"
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    const clickedButton = target.closest('button')
                    const clickedLink = target.closest('a')
                    const clickedInteractive = target.closest('[data-no-navigate]')
                    const clickedShareMenu = target.closest('[data-share-menu]')
                    
                    if (clickedButton || clickedLink || clickedInteractive || clickedShareMenu) {
                      return
                    }
                    
                    trackView(item.id).then(success => {
                      if (success) {
                        setViewCountUpdates(prev => ({
                          ...prev,
                          [item.id]: (prev[item.id] || 0) + 1
                        }))
                      }
                    })
                    
                    router.push(`/portfolio/${item.id}`)
                  }}
                >
                  {/* MEDIA SECTION */}
                  <div className="relative">
                    {coverMedia?.media_type === 'image' ? (
                      <img
                        src={coverMedia.media_url || item.cover_media_url}
                        alt={item.title || 'Portfolio'}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&auto=format&fit=crop'
                        }}
                      />
                    ) : (
                      <VideoPreview
                        src={coverMedia?.media_url}
                        poster={item.cover_media_url}
                        className="w-full"
                      />
                    )}
                    
                    {hasMultipleMedia && (
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 border border-gray-300">
                        <Grid size={10} className="text-gray-800" />
                        <span className="text-xs text-gray-800">{item.media_count}</span>
                      </div>
                    )}
                    
                    {item.is_featured && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 border border-gray-300">
                        <Star className="fill-green-600 text-green-600" size={12} />
                      </div>
                    )}
                  </div>

                  {/* CONTENT SECTION */}
                  <div className="p-3">
                    {/* CREATOR INFO */}
                    <div 
                      className="flex items-center gap-2 mb-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link 
                        href={`/creator/${item.profiles?.id}`}
                        className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                      >
                        {item.profiles?.profile_image_url ? (
                          <img
                            src={item.profiles.profile_image_url}
                            alt={item.profiles.display_name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <User size={12} className="text-gray-600" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/creator/${item.profiles?.id}`}
                          className="font-medium text-xs truncate hover:underline block text-gray-900"
                        >
                          {item.profiles?.display_name || 'Unknown Creator'}
                        </Link>
                        {item.profiles?.location && (
                          <div className="text-[10px] text-gray-600 truncate">
                            {item.profiles.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TITLE & DESCRIPTION */}
                    <div className="mb-2">
                      {item.title && (
                        <div className="font-semibold text-xs line-clamp-1 mb-1 text-gray-900">
                          {item.title}
                        </div>
                      )}
                      {item.description && (
                        <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {/* CATEGORY & STATS */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-block rounded-full bg-green-50 text-green-800 px-2 py-1 text-xs truncate max-w-28 border border-green-100">
                        {item.category}
                      </span>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Eye size={8} />
                        <span>{displayViewCount}</span>
                        {hasMultipleMedia && (
                          <span className="ml-1">• {item.media_count} files</span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS - Improved visibility */}
                    <div 
                      className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100"
                      onClick={(e) => e.stopPropagation()}
                      data-no-navigate="true"
                    >
                      <div className="flex items-center gap-1">
                        <div data-no-navigate="true">
                          <LikeSaveButtons 
                            itemId={item.id}
                            initialLikeCount={item.like_count || 0}
                            initialSaveCount={item.save_count || 0}
                            size="sm"
                            showCounts={false}
                          />
                        </div>
                        <button 
                          className="text-gray-500 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100"
                          onClick={(e) => {
                            e.preventDefault()
                          }}
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                      
                      <button 
                        className="text-gray-500 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // EMPTY STATE
        <div className="py-20 text-center">
          <div className="text-gray-600 mb-4">No posts to show</div>
          <button
            onClick={refreshFeed}
            className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800"
          >
            Load Posts
          </button>
        </div>
      )}

      {/* NO FILTER RESULTS */}
      {filteredItems.length === 0 && items.length > 0 && (
        <div className="py-20 text-center">
          <div className="text-gray-600">No items match your filters</div>
          <div className="mt-2 text-sm text-gray-500">
            Try changing your filter settings
          </div>
        </div>
      )}
    </div>
  )
}