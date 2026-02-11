// components/feed/HomeFeed.tsx - IMPROVED COMMENTS DISPLAY
'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import VideoPreview from '@/components/common/VideoPreview'
import Link from 'next/link'
import { Star, Heart, MessageCircle, Share2, User, Grid, Check, RefreshCw, Eye, Send, X, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import LikeSaveButtons from '@/components/interactions/LikeSaveButtons'
import { trackView } from '@/lib/utils/viewTracker'
import { feedCache } from '@/lib/FeedCache'
import { formatDistanceToNow } from 'date-fns'

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
    avg_rating?: number
    total_reviews?: number
  }
  portfolio_media: {
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_display_name: string
  user_profile_image_url: string | null
  user_creator_type: string
  likes_count: number
  reply_count: number
}

interface Filters {
  location: string
  creatorType: string
  mediaType: string
}

interface HomeFeedProps {
  filters: Filters
}

// ALGORITHMIC SHUFFLE FUNCTION (keep existing)
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

// CONTENT VARIETY FUNCTION (keep existing)
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
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  
  const feedRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // CHECK CACHE ON MOUNT
  useEffect(() => {
    if (hasLoadedRef.current) return
    
    const cacheKey = `homeFeed_${JSON.stringify(filters)}`
    const cachedData = feedCache.get<FeedItem[]>(cacheKey)
    
    if (cachedData) {
      setItems(cachedData.data)
      setSessionSeed(cachedData.seed)
      hasLoadedRef.current = true
      
      // Preload comment counts for cached items
      cachedData.data.forEach(item => {
        loadCommentCount(item.id)
      })
    } else {
      const seed = Math.floor(Math.random() * 10000)
      setSessionSeed(seed)
      loadFeedItems(seed)
      hasLoadedRef.current = true
    }
  }, [])

  // LOAD FEED ITEMS WITH RATINGS
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
            creator_type,
            avg_rating,
            total_reviews
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
      
      // Load comment counts for all items
      variedItems.forEach(item => {
        loadCommentCount(item.id)
      })
      
      const cacheKey = `homeFeed_${JSON.stringify(filters)}`
      feedCache.set(cacheKey, variedItems, seed)
      
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // LOAD COMMENT COUNT FOR AN ITEM
  async function loadCommentCount(itemId: string) {
    try {
      const { count, error } = await supabase
        .from('portfolio_comments')
        .select('*', { count: 'exact', head: true })
        .eq('portfolio_item_id', itemId)
        .eq('moderation_status', 'approved')

      if (error) throw error

      setCommentCounts(prev => ({
        ...prev,
        [itemId]: count || 0
      }))
    } catch (error) {
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // LOAD COMMENTS FOR A SPECIFIC ITEM
  async function loadComments(itemId: string) {
    setLoadingComments(prev => ({ ...prev, [itemId]: true }))
    
    try {
      const { data, error } = await supabase
        .from('portfolio_comments')
        .select(`
          id,
          content,
          created_at,
          user_display_name,
          user_profile_image_url,
          user_creator_type,
          likes_count,
          reply_count
        `)
        .eq('portfolio_item_id', itemId)
        .eq('moderation_status', 'approved')
        .is('parent_comment_id', null) // Only top-level comments in feed
        .order('created_at', { ascending: false })
        .limit(3) // Show only 3 comments in feed

      if (error) throw error

      setComments(prev => ({
        ...prev,
        [itemId]: data || []
      }))
    } catch (error) {
    } finally {
      setLoadingComments(prev => ({ ...prev, [itemId]: false }))
    }
  }

  // TOGGLE COMMENT SECTION
  const toggleComments = (itemId: string) => {
    const newState = !showComments[itemId]
    setShowComments(prev => ({ ...prev, [itemId]: newState }))
    
    if (newState) {
      // Auto-focus textarea when opening comments
      setTimeout(() => {
        textareaRefs.current[itemId]?.focus()
      }, 100)
      
      if (!comments[itemId]) {
        loadComments(itemId)
      }
    }
  }

  // POST A COMMENT
  async function postComment(itemId: string) {
    const commentText = newComment[itemId]?.trim()
    if (!commentText) return

    setPostingComment(prev => ({ ...prev, [itemId]: true }))

    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        alert('Please sign in to comment')
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, profile_image_url, creator_type')
        .eq('id', user.user.id)
        .single()

      // Submit comment
      const { data: newCommentData, error } = await supabase
        .from('portfolio_comments')
        .insert({
          portfolio_item_id: itemId,
          user_id: user.user.id,
          content: commentText,
          user_display_name: profile?.display_name || 'User',
          user_profile_image_url: profile?.profile_image_url,
          user_creator_type: profile?.creator_type,
          moderation_status: 'approved'
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      const commentWithData: Comment = {
        id: newCommentData.id,
        content: newCommentData.content,
        created_at: newCommentData.created_at,
        user_display_name: profile?.display_name || 'User',
        user_profile_image_url: profile?.profile_image_url,
        user_creator_type: profile?.creator_type || '',
        likes_count: 0,
        reply_count: 0
      }

      setComments(prev => ({
        ...prev,
        [itemId]: [commentWithData, ...(prev[itemId] || [])]
      }))

      // Update comment count
      setCommentCounts(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }))

      // Clear input
      setNewComment(prev => ({ ...prev, [itemId]: '' }))

      // Auto-resize textarea
      const textarea = textareaRefs.current[itemId]
      if (textarea) {
        textarea.style.height = 'auto'
      }

      // Show success toast
      setToastMessage('Comment posted!')
      setToastType('success')
      setTimeout(() => setToastMessage(null), 3000)

    } catch (error) {
      setToastMessage('Failed to post comment')
      setToastType('error')
      setTimeout(() => setToastMessage(null), 3000)
    } finally {
      setPostingComment(prev => ({ ...prev, [itemId]: false }))
    }
  }

  // Handle textarea auto-resize
  const handleTextareaChange = (itemId: string, value: string) => {
    setNewComment(prev => ({ ...prev, [itemId]: value }))
    
    // Auto-resize
    const textarea = textareaRefs.current[itemId]
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`
    }
  }

  // Handle Enter key to submit comment
  const handleTextareaKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newComment[itemId]?.trim()) {
        postComment(itemId)
      }
    }
  }

  // FILTERED ITEMS
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

      {/* MASONRY GRID */}
      {filteredItems.length > 0 ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3">
          {filteredItems.map((item, index) => {
            const coverMedia = item.portfolio_media?.find(m => m.display_order === 0) || 
                             item.portfolio_media?.[0]
            const hasMultipleMedia = item.media_count > 1
            const displayViewCount = (viewCountUpdates[item.id] || 0) + item.view_count
            const itemComments = comments[item.id] || []
            const showCommentSection = showComments[item.id]
            const totalComments = commentCounts[item.id] || 0
            
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
                    const clickedTextarea = target.closest('textarea')
                    const clickedComment = target.closest('[data-comment-section]')
                    
                    if (clickedButton || clickedLink || clickedInteractive || clickedShareMenu || clickedTextarea || clickedComment) {
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
                    {/* CREATOR INFO WITH RATING */}
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
                        <div className="flex items-center gap-1">
                          <Link 
                            href={`/creator/${item.profiles?.id}`}
                            className="font-medium text-xs truncate hover:underline block text-gray-900"
                          >
                            {item.profiles?.display_name || 'Unknown Creator'}
                          </Link>
                          
                          {/* RATING BADGE */}
                          {item.profiles?.avg_rating && item.profiles.avg_rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Star size={10} className="fill-yellow-500 text-yellow-500" />
                              <span className="text-xs font-medium text-gray-900">
                                {item.profiles.avg_rating.toFixed(1)}
                              </span>
                              {item.profiles.total_reviews && item.profiles.total_reviews > 0 && (
                                <span className="text-xs text-gray-600">
                                  ({item.profiles.total_reviews})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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

                    {/* IMPROVED COMMENT DROPDOWN SECTION */}
                    <div data-comment-section="true" onClick={(e) => e.stopPropagation()}>
                      {/* Comment dropdown toggle button */}
                      <button
                        className={`w-full text-left mb-2 py-1.5 px-2 rounded-lg transition-colors ${
                          showCommentSection 
                            ? 'bg-gray-50 border border-gray-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleComments(item.id)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageCircle size={14} className={showCommentSection ? 'text-green-600' : 'text-gray-500'} />
                            <span className="text-xs font-medium text-gray-700">
                              {totalComments} comment{totalComments !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform ${
                              showCommentSection ? 'rotate-180 text-green-600' : 'text-gray-400'
                            }`}
                          />
                        </div>
                      </button>

                      {/* Comment Section Content */}
                      {showCommentSection && (
                        <div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
                          {/* Comments List */}
                          <div className="mb-3 max-h-48 overflow-y-auto pr-1">
                            {loadingComments[item.id] ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader size={16} className="animate-spin text-gray-400" />
                              </div>
                            ) : itemComments.length > 0 ? (
                              <div className="space-y-3">
                                {itemComments.map((comment) => (
                                  <div key={comment.id} className="flex items-start gap-2">
                                    <div className="h-6 w-6 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                      {comment.user_profile_image_url ? (
                                        <img
                                          src={comment.user_profile_image_url}
                                          alt={comment.user_display_name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                          <User size={12} className="text-gray-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-xs font-semibold text-gray-900">
                                          {comment.user_display_name}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-700 mb-1">
                                        {comment.content}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <button className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                          <Heart size={10} />
                                          <span>{comment.likes_count || 0}</span>
                                        </button>
                                        <button className="text-[10px] text-gray-500 hover:text-green-700">
                                          Reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* View all comments link */}
                                {totalComments > 3 && (
                                  <div className="pt-2 border-t border-gray-100">
                                    <Link
                                      href={`/portfolio/${item.id}#comments`}
                                      className="text-xs text-green-700 hover:text-green-800 font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View all {totalComments} comments →
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <div className="text-xs text-gray-500 mb-2">No comments yet</div>
                                <div className="text-[10px] text-gray-400">Be the first to comment!</div>
                              </div>
                            )}
                          </div>

                          {/* Improved Comment Input */}
                          <div className="relative">
                            <textarea
                              ref={el => {
                                if (el) {
                                  textareaRefs.current[item.id] = el;}
                                }}    
                              value={newComment[item.id] || ''}
                              onChange={(e) => handleTextareaChange(item.id, e.target.value)}
                              onKeyDown={(e) => handleTextareaKeyDown(e, item.id)}
                              placeholder="Add a comment..."
                              className="w-full p-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-green-600 resize-none pr-10"
                              rows={1}
                              maxLength={200}
                              style={{ minHeight: '40px', maxHeight: '80px' }}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">
                                {200 - (newComment[item.id]?.length || 0)}
                              </span>
                              <button
                                onClick={() => postComment(item.id)}
                                disabled={!newComment[item.id]?.trim() || postingComment[item.id]}
                                className="p-1.5 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Post comment"
                              >
                                {postingComment[item.id] ? (
                                  <Loader size={12} className="animate-spin" />
                                ) : (
                                  <Send size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          {/* Quick tip */}
                          <div className="text-[10px] text-gray-500 mt-2 text-center">
                            Press Enter to post • Shift+Enter for new line
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS */}
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
                      </div>
                      
                      <button 
                        className="text-gray-500 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          // Share functionality
                          if (navigator.share) {
                            navigator.share({
                              title: item.title || 'Portfolio Post',
                              text: `Check out this work by ${item.profiles?.display_name || 'a creator'}`,
                              url: `${window.location.origin}/portfolio/${item.id}`
                            })
                          } else {
                            // Fallback copy link
                            navigator.clipboard.writeText(`${window.location.origin}/portfolio/${item.id}`)
                            setToastMessage('Link copied!')
                            setToastType('success')
                            setTimeout(() => setToastMessage(null), 3000)
                          }
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