
// app/(client)/creator/[id]/page.tsx - UPDATED WITH CLICKABLE PORTFOLIO POSTS
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  Mail, Phone, Instagram, MapPin, Camera, Video, 
  Star, MessageCircle, Heart, Eye, Folder, Grid, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { trackView } from '@/lib/utils/viewTracker'

interface CreatorProfile {
  id: string
  display_name: string
  location: string
  email: string
  whatsapp_number: string
  instagram_url: string
  profile_image_url: string
  creator_type: string
  created_at: string
  current_plan_type: string
}

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
  portfolio_media: {
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const creatorId = params.id as string
  
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewCountUpdates, setViewCountUpdates] = useState<Record<string, number>>({})

  useEffect(() => {
    if (creatorId) {
      loadCreatorProfile()
    }
  }, [creatorId])

  async function loadCreatorProfile() {
    try {
      // Load creator profile
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single()

      if (creatorError) throw creatorError

      // Load creator's portfolio items WITH media
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          portfolio_media (
            media_url,
            media_type,
            display_order
          )
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })

      if (portfolioError) throw portfolioError

      setCreator(creatorData)
      setPortfolioItems(portfolioData || [])
    } catch (error) {
      console.error('Error loading creator profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePortfolioClick = async (itemId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    
    // Don't navigate if clicking on interactive elements inside the card
    const clickedButton = target.closest('button')
    const clickedLink = target.closest('a')
    
    if (clickedButton || clickedLink) {
      return
    }
    
    // Track view count
    const success = await trackView(itemId)
    if (success) {
      // Update local state for immediate UI feedback
      setViewCountUpdates(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1
      }))
    }
    
    // Navigate to portfolio detail page
    router.push(`/portfolio/${itemId}`)
  }

  // Helper to get updated view count
  const getViewCount = (itemId: string, baseCount: number) => {
    const updateCount = viewCountUpdates[itemId] || 0
    return baseCount + updateCount
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-gray-600">Creator not found</div>
          <Link href="/" className="mt-4 inline-block text-green-800 hover:underline font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const whatsappUrl = creator.whatsapp_number 
    ? `https://wa.me/${creator.whatsapp_number.replace(/\D/g, '')}`
    : null

  // Calculate totals
  const totalPosts = portfolioItems.length
  const totalViews = portfolioItems.reduce((sum, item) => sum + item.view_count, 0)
  const totalLikes = portfolioItems.reduce((sum, item) => sum + item.like_count, 0)
  const totalSaves = portfolioItems.reduce((sum, item) => sum + item.save_count, 0)

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
            <div className="text-sm text-green-200">Creator Profile</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Creator info header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Profile image */}
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {creator.profile_image_url ? (
                <img
                  src={creator.profile_image_url}
                  alt={creator.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-4xl text-gray-700">
                  {creator.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Creator details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 text-gray-900">{creator.display_name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {creator.location && (
                  <div className="flex items-center gap-1 text-gray-700">
                    <MapPin size={16} />
                    <span>{creator.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-700">
                  <Camera size={16} />
                  <span className="capitalize">{creator.creator_type}</span>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-wrap gap-3">
                {creator.email && (
                  <a
                    href={`mailto:${creator.email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Mail size={16} />
                    <span>Email</span>
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone size={16} />
                    <span>WhatsApp</span>
                  </a>
                )}

                {creator.instagram_url && (
                  <a
                    href={creator.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    <Instagram size={16} />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded">
                <Folder className="text-blue-700" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalPosts}</div>
                <div className="text-sm text-gray-600">Posts</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded">
                <Eye className="text-green-700" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</div>
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
                <div className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Likes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded">
                <Star className="text-yellow-700" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalSaves.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Saves</div>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Portfolio Posts</h2>
            <div className="text-sm text-gray-600">
              {portfolioItems.length} post{portfolioItems.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {portfolioItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Folder size={48} className="text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600">No portfolio posts yet</div>
              <p className="text-sm text-gray-500 mt-2">
                This creator hasn't uploaded any work yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolioItems.map((item) => {
                const coverMedia = item.portfolio_media?.find(m => m.display_order === 0) || 
                                 item.portfolio_media?.[0]
                const hasMultipleMedia = item.media_count > 1
                const displayViewCount = getViewCount(item.id, item.view_count)
                
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg overflow-hidden hover:opacity-95 transition-opacity group cursor-pointer border border-gray-200 shadow-sm hover:shadow-md"
                    onClick={(e) => handlePortfolioClick(item.id, e)}
                  >
                    {/* Media */}
                    <div className="relative aspect-square">
                      {coverMedia?.media_type === 'image' ? (
                        <img
                          src={coverMedia.media_url || item.cover_media_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Video size={40} className="text-gray-500" />
                        </div>
                      )}
                      
                      {/* Multiple media indicator */}
                      {hasMultipleMedia && (
                        <div className="absolute top-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
                          <Grid size={10} />
                          <span>{item.media_count}</span>
                        </div>
                      )}
                      
                      {item.is_featured && (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 border border-gray-300">
                          <Star className="fill-yellow-500 text-yellow-600" size={16} />
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-center p-4">
                          <div className="text-white font-medium mb-1 text-lg">
                            View Post
                          </div>
                          <div className="text-sm text-gray-300 mb-2">
                            Click to view details
                          </div>
                          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs text-white">
                            {item.category}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {coverMedia?.media_type === 'image' ? (
                            <Camera size={14} className="text-blue-600" />
                          ) : (
                            <Video size={14} className="text-green-600" />
                          )}
                          <span className="text-xs text-gray-600">{item.category}</span>
                        </div>
                        {item.is_featured && (
                          <div className="flex items-center gap-1 text-xs text-yellow-600">
                            <Star size={12} className="fill-yellow-500" />
                            <span>Featured</span>
                          </div>
                        )}
                      </div>
                      
                      {item.title && (
                        <div className="font-medium text-sm mb-1 line-clamp-1 text-gray-900">
                          {item.title}
                        </div>
                      )}
                      
                      {item.description && (
                        <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {item.description}
                        </div>
                      )}
                      
                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye size={12} />
                            <span>{displayViewCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart size={12} />
                            <span>{item.like_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={12} />
                            <span>{item.save_count}</span>
                          </div>
                        </div>
                        {hasMultipleMedia && (
                          <div className="text-xs text-gray-500">
                            {item.media_count} files
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}