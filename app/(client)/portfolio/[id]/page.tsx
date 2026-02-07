'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  ArrowLeft, Heart, Star, Share2, Eye, MessageCircle, 
  User, MapPin, Calendar, X, ChevronLeft, ChevronRight,
  Camera, Video as VideoIcon, Maximize2, Grid, Download,
  Bookmark, MoreVertical, Flag
} from 'lucide-react'
import Link from 'next/link'
import LikeSaveButtons from '@/components/interactions/LikeSaveButtons'
import { trackView } from '@/lib/utils/viewTracker'

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
  creator_id: string
  profiles?: {
    id: string
    display_name: string
    location?: string
    profile_image_url?: string
    creator_type?: string
  }
  portfolio_media: {
    id: string
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

export default function PortfolioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string
  
  const [item, setItem] = useState<PortfolioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [viewCountUpdated, setViewCountUpdated] = useState(false)

  useEffect(() => {
    if (itemId) {
      loadPortfolioItem()
      // Track view when page loads
      trackPageView()
    }
  }, [itemId])

  const loadPortfolioItem = useCallback(async () => {
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
            id,
            media_url,
            media_type,
            display_order
          )
        `)
        .eq('id', itemId)
        .single()

      if (error) throw error

      if (!data) {
        setError('Portfolio post not found')
        return
      }

      setItem(data)
    } catch (error: any) {
      console.error('Error loading portfolio item:', error)
      setError(error.message || 'Failed to load portfolio post')
    } finally {
      setLoading(false)
    }
  }, [itemId])

  const trackPageView = useCallback(async () => {
    try {
      console.log('🔄 Tracking view for portfolio detail:', itemId)
      
      const success = await trackView(itemId)
      
      if (success) {
        console.log('✅ View count updated on detail page')
        setViewCountUpdated(true)
        // Refresh the item data to show updated view count
        await loadPortfolioItem()
      } else {
        console.log('❌ Failed to update view count on detail page')
      }
      
    } catch (error) {
      console.error('Error tracking view on detail page:', error)
    }
  }, [itemId, loadPortfolioItem])

  const nextMedia = () => {
    if (item && currentMediaIndex < item.media_count - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1)
    }
  }

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextMedia()
    if (e.key === 'ArrowLeft') prevMedia()
    if (e.key === 'Escape') setShowFullscreen(false)
  }, [currentMediaIndex, item])

  useEffect(() => {
    if (showFullscreen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showFullscreen, handleKeyDown])

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => alert('Failed to copy link'))
    setShowShareMenu(false)
  }

  const shareToWhatsApp = () => {
    const url = window.location.href
    const text = `Check out this portfolio post: ${item?.title || 'Amazing work'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
    setShowShareMenu(false)
  }

  const shareToTwitter = () => {
    const url = window.location.href
    const text = `Check out this amazing work on Shootshots!`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    setShowShareMenu(false)
  }

  const downloadMedia = async () => {
    if (!item) return
    
    const currentMedia = item.portfolio_media?.[currentMediaIndex]
    if (!currentMedia) return

    try {
      const response = await fetch(currentMedia.media_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shootshots-${item.title || 'post'}-${currentMediaIndex + 1}.${currentMedia.media_type === 'image' ? 'jpg' : 'mp4'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download media')
    }
  }

  const reportPost = () => {
    if (confirm('Report this post for inappropriate content?')) {
      alert('Thank you for reporting. Our team will review this post.')
      setShowMoreMenu(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-gray-600">Loading post...</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">{error || 'Post not found'}</div>
          <Link href="/" className="text-green-800 hover:underline font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const currentMedia = item.portfolio_media?.[currentMediaIndex]
  const creator = item.profiles
  const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* DARK GREEN HEADER */}
      <header className="sticky top-0 z-50 border-b border-green-800 bg-green-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-green-200 hover:text-white"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4">
                <LikeSaveButtons 
                  itemId={item.id}
                  initialLikeCount={item.like_count || 0}
                  initialSaveCount={item.save_count || 0}
                  size="md"
                  showCounts={true}
                />
                
                {/* Share dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 hover:bg-green-800 rounded-lg text-green-200 hover:text-white"
                  >
                    <Share2 size={20} />
                  </button>
                  
                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-green-800 border border-green-700 rounded-lg shadow-xl z-50">
                      <div className="py-2">
                        <button
                          onClick={copyLink}
                          className="w-full text-left px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={shareToWhatsApp}
                          className="w-full text-left px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                        >
                          Share on WhatsApp
                        </button>
                        <button
                          onClick={shareToTwitter}
                          className="w-full text-left px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                        >
                          Share on Twitter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile menu */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 hover:bg-green-800 rounded-lg text-green-200 hover:text-white"
                >
                  <MoreVertical size={20} />
                </button>
                
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-green-800 border border-green-700 rounded-lg shadow-xl z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-green-700">
                        <div className="text-sm font-medium text-green-200">Actions</div>
                      </div>
                      <button
                        onClick={downloadMedia}
                        className="w-full text-left px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white flex items-center gap-2"
                      >
                        <Download size={14} />
                        Download
                      </button>
                      <button
                        onClick={reportPost}
                        className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-green-700 hover:text-red-200 flex items-center gap-2"
                      >
                        <Flag size={14} />
                        Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Media Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              {/* Main media display */}
              <div className="relative aspect-[4/3] bg-gray-50">
                {currentMedia?.media_type === 'image' ? (
                  <img
                    src={currentMedia.media_url}
                    alt={item.title || `Image ${currentMediaIndex + 1}`}
                    className="w-full h-full object-contain"
                    onClick={() => setShowFullscreen(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={currentMedia?.media_url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      playsInline
                    />
                  </div>
                )}

                {/* Navigation arrows for multiple media */}
                {item.media_count > 1 && (
                  <>
                    {currentMediaIndex > 0 && (
                      <button
                        onClick={prevMedia}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-gray-800/60 text-white rounded-full hover:bg-gray-800/80 transition-colors"
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}
                    {currentMediaIndex < item.media_count - 1 && (
                      <button
                        onClick={nextMedia}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-gray-800/60 text-white rounded-full hover:bg-gray-800/80 transition-colors"
                      >
                        <ChevronRight size={24} />
                      </button>
                    )}
                  </>
                )}

                {/* Media counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/70 text-white px-3 py-1.5 rounded-full text-sm">
                  {currentMediaIndex + 1} / {item.media_count}
                </div>

                {/* Fullscreen button */}
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="absolute top-4 right-4 p-2 bg-gray-800/60 text-white rounded-full hover:bg-gray-800/80"
                >
                  <Maximize2 size={20} />
                </button>

                {/* Download button */}
                <button
                  onClick={downloadMedia}
                  className="absolute top-4 right-16 p-2 bg-gray-800/60 text-white rounded-full hover:bg-gray-800/80"
                >
                  <Download size={20} />
                </button>
              </div>

              {/* Thumbnail strip */}
              {item.media_count > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {item.portfolio_media
                      ?.sort((a, b) => a.display_order - b.display_order)
                      .map((media, index) => (
                      <button
                        key={media.id}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          currentMediaIndex === index 
                            ? 'border-green-600 scale-105' 
                            : 'border-transparent hover:border-gray-400'
                        }`}
                      >
                        {media.media_type === 'image' ? (
                          <img
                            src={media.media_url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <VideoIcon size={14} className="text-gray-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex items-center justify-between mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm sm:hidden">
              <LikeSaveButtons 
                itemId={item.id}
                initialLikeCount={item.like_count || 0}
                initialSaveCount={item.save_count || 0}
                size="md"
                showCounts={true}
              />
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-gray-900"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="space-y-6">
            {/* Creator info */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Link 
                  href={`/creator/${creator?.id}`}
                  className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
                >
                  {creator?.profile_image_url ? (
                    <img
                      src={creator.profile_image_url}
                      alt={creator.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-gray-600" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/creator/${creator?.id}`}
                    className="font-bold text-lg hover:underline truncate block text-gray-900"
                  >
                    {creator?.display_name || 'Unknown Creator'}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                    {creator?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{creator.location}</span>
                      </div>
                    )}
                    {creator?.creator_type && (
                      <div className="flex items-center gap-1">
                        <Camera size={12} />
                        <span className="capitalize">{creator.creator_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{item.view_count.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{item.like_count.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Likes</div>
                </div>
              </div>

              {/* Contact creator button */}
              <Link
                href={`/creator/${creator?.id}`}
                className="block w-full mt-4 px-4 py-3 bg-green-900 text-white hover:bg-green-800 text-center rounded-lg font-medium transition-colors"
              >
                View Creator Profile
              </Link>
            </div>

            {/* Post details */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{item.title || 'Untitled Post'}</h1>
                  {item.is_featured && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star size={16} className="fill-yellow-500" />
                      <span className="text-sm">Featured</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Grid size={14} />
                    <span>{item.media_count} media</span>
                  </div>
                </div>

                <div className="inline-block px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-100">
                  {item.category}
                </div>
              </div>

              {item.description && (
                <div className="mt-6">
                  <h3 className="font-medium mb-2 text-gray-900">Description</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                </div>
              )}
            </div>

            {/* Comments section (placeholder) */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="font-medium mb-4 text-gray-900">Comments</h3>
              <div className="text-center py-8">
                <MessageCircle size={32} className="text-gray-400 mx-auto mb-3" />
                <div className="text-gray-600">Comments coming soon</div>
                <p className="text-sm text-gray-500 mt-1">
                  We're working on adding comments functionality
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen modal */}
      {showFullscreen && currentMedia && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-gray-800/50 text-white rounded-full hover:bg-gray-800/70 z-10"
          >
            <X size={24} />
          </button>
          
          {currentMedia.media_type === 'image' ? (
            <img
              src={currentMedia.media_url}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={currentMedia.media_url}
              className="max-w-full max-h-full"
              controls
              autoPlay
            />
          )}
          
          {/* Fullscreen navigation */}
          {item.media_count > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={prevMedia}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-4 bg-gray-800/50 text-white rounded-full hover:bg-gray-800/70 z-10"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              {currentMediaIndex < item.media_count - 1 && (
                <button
                  onClick={nextMedia}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-4 bg-gray-800/50 text-white rounded-full hover:bg-gray-800/70 z-10"
                >
                  <ChevronRight size={32} />
                </button>
              )}
              
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800/70 text-white px-4 py-2 rounded-full text-lg">
                {currentMediaIndex + 1} / {item.media_count}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}