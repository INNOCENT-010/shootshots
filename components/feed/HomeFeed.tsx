// components/feed/HomeFeed.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Heart, MessageCircle, Share2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import LikeSaveButtons from '@/components/interactions/LikeSaveButtons'

interface FeedItem {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  title?: string
  description?: string
  category: string
  is_featured: boolean
  view_count: number
  like_count: number
  save_count: number
  created_at: string
  profiles?: {
    id: string
    display_name: string
    location?: string
    profile_image_url?: string
    creator_type?: string
  }
}

// Filter types
interface Filters {
  location: string
  creatorType: string
  mediaType: string
}

// Props for component
interface HomeFeedProps {
  filters: Filters
}

export default function HomeFeed({ filters }: HomeFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [filteredItems, setFilteredItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeedItems()
  }, [])

  // Apply filters whenever filters or items change
  useEffect(() => {
    applyFilters()
  }, [filters, items])

  async function loadFeedItems() {
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
          )
        `)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setItems(data || [])
      setFilteredItems(data || [])
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Function to apply filters
  function applyFilters() {
    let result = [...items]

    // Apply location filter
    if (filters.location !== 'All') {
      result = result.filter(item => 
        item.profiles?.location === filters.location
      )
    }

    // Apply creator type filter
    if (filters.creatorType !== 'All') {
      const creatorTypeMap: Record<string, string> = {
        'Photo': 'photographer',
        'Video': 'videographer',
        'Mobile': 'mobile'
      }
      
      const targetType = creatorTypeMap[filters.creatorType] || filters.creatorType.toLowerCase()
      
      result = result.filter(item => {
        const creatorType = item.profiles?.creator_type?.toLowerCase() || ''
        return creatorType.includes(targetType)
      })
    }

    // Apply media type filter
    if (filters.mediaType !== 'All') {
      const mediaTypeMap: Record<string, string> = {
        'Images': 'image',
        'Videos': 'video'
      }
      
      const targetMedia = mediaTypeMap[filters.mediaType] || filters.mediaType.toLowerCase()
      result = result.filter(item => 
        item.media_type === targetMedia
      )
    }

    setFilteredItems(result)
  }

  async function trackView(itemId: string) {
    try {
      await supabase
        .from('portfolio_items')
        .update({ view_count: () => 'view_count + 1' })
        .eq('id', itemId)
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full px-2 py-3">
      {/* Filter summary */}
      <div className="mb-3 text-xs text-gray-400">
        Showing {filteredItems.length} of {items.length} items
        {(filters.location !== 'All' || filters.creatorType !== 'All' || filters.mediaType !== 'All') && (
          <span className="ml-2">
            • Filtered by: 
            {filters.location !== 'All' && ` ${filters.location}`}
            {filters.creatorType !== 'All' && ` • ${filters.creatorType}`}
            {filters.mediaType !== 'All' && ` • ${filters.mediaType}`}
          </span>
        )}
      </div>

      {/* Pinterest-style masonry grid */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="break-inside-avoid mb-2 relative group"
            onClick={() => trackView(item.id)}
          >
            {/* Card container */}
            <div className="bg-gray-900 rounded-lg overflow-hidden hover:opacity-95 transition-opacity">
              {/* Media container */}
              <div className="relative">
                {item.media_type === 'image' ? (
                  <img
                    src={item.media_url}
                    alt={item.title || 'Portfolio'}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&auto=format&fit=crop'
                    }}
                  />
                ) : (
                  <video
                    src={item.media_url}
                    className="w-full h-auto object-cover"
                    controls
                    muted
                    preload="metadata"
                  />
                )}
                
                {/* Featured badge */}
                {item.is_featured && (
                  <div className="absolute top-1 right-1">
                    <Star className="fill-white text-white" size={12} />
                  </div>
                )}

                {/* Quick stats overlay */}
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                    <Heart size={10} className="text-white" />
                    <span className="text-xs text-white">{item.save_count}</span>
                  </div>
                </div>
              </div>

              {/* Info section BELOW image */}
              <div className="p-2">
                {/* Creator info */}
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href={`/creator/${item.profiles?.id}`}
                    className="h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {item.profiles?.profile_image_url ? (
                      <img
                        src={item.profiles.profile_image_url}
                        alt={item.profiles.display_name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={10} />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/creator/${item.profiles?.id}`}
                      className="font-medium text-xs truncate hover:underline block"
                    >
                      {item.profiles?.display_name || 'Unknown Creator'}
                    </Link>
                    {item.profiles?.location && (
                      <div className="text-[10px] text-gray-400 truncate">
                        {item.profiles.location}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title & description */}
                <div className="mb-1">
                  {item.title && (
                    <div className="font-semibold text-xs line-clamp-1 mb-0.5">
                      {item.title}
                    </div>
                  )}
                  {item.description && (
                    <div className="text-[11px] text-gray-300 line-clamp-2">
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Category and stats */}
                <div className="flex items-center justify-between">
                  <span className="inline-block rounded-full bg-white/10 px-2 py-1 text-xs truncate max-w-[100px]">
                    {item.category}
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {item.view_count} views
                  </div>
                </div>

                {/* Action buttons - UPDATED WITH LIKESAVE BUTTONS */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <LikeSaveButtons 
                      itemId={item.id}
                      initialLikeCount={item.like_count || 0}
                      initialSaveCount={item.save_count || 0}
                      size="sm"
                      showCounts={false}
                    />
                    <button className="text-gray-400 hover:text-white ml-1">
                      <MessageCircle size={12} />
                    </button>
                  </div>
                  <button className="text-gray-400 hover:text-white">
                    <Share2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-20 text-center">
          <div className="text-gray-400">No items match your filters</div>
          <div className="mt-2 text-sm text-gray-500">
            Try changing your filter settings
          </div>
        </div>
      )}
    </div>
  )
}