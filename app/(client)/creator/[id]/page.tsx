'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Mail, Phone, Instagram, MapPin, Camera, Video, Star, MessageCircle } from 'lucide-react'
import Link from 'next/link'

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
}

interface PortfolioItem {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  title: string
  description: string
  category: string
  is_featured: boolean
  view_count: number
  save_count: number
  created_at: string
}

export default function CreatorProfilePage() {
  const params = useParams()
  const creatorId = params.id as string
  
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

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

      // Load creator's portfolio items
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('*')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-gray-400">Creator not found</div>
          <Link href="/" className="mt-4 inline-block text-white hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const whatsappUrl = creator.whatsapp_number 
    ? `https://wa.me/${creator.whatsapp_number.replace(/\D/g, '')}`
    : null

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-bold hover:opacity-80">
              ← Shootshots
            </Link>
            <div className="text-sm text-gray-400">Creator Profile</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Creator info header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Profile image */}
            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              {creator.profile_image_url ? (
                <img
                  src={creator.profile_image_url}
                  alt={creator.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-4xl">
                  {creator.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Creator details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{creator.display_name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {creator.location && (
                  <div className="flex items-center gap-1 text-gray-300">
                    <MapPin size={16} />
                    <span>{creator.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-300">
                  <Camera size={16} />
                  <span className="capitalize">{creator.creator_type}</span>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-wrap gap-3">
                {creator.email && (
                  <a
                    href={`mailto:${creator.email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors"
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
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="text-2xl font-bold">{portfolioItems.length}</div>
            <div className="text-sm text-gray-400">Portfolio Items</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="text-2xl font-bold">
              {portfolioItems.reduce((sum, item) => sum + item.view_count, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Views</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="text-2xl font-bold">
              {portfolioItems.reduce((sum, item) => sum + item.save_count, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Saves</div>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="text-2xl font-bold">
              {portfolioItems.filter(item => item.is_featured).length}
            </div>
            <div className="text-sm text-gray-400">Featured</div>
          </div>
        </div>

        {/* Portfolio grid */}
        <div>
          <h2 className="text-xl font-bold mb-4">Portfolio</h2>
          
          {portfolioItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-lg">
              <div className="text-gray-400">No portfolio items yet</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:opacity-95 transition-opacity"
                >
                  {/* Media */}
                  <div className="relative aspect-square">
                    {item.media_type === 'image' ? (
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    )}
                    
                    {item.is_featured && (
                      <div className="absolute top-2 right-2">
                        <Star className="fill-white text-white" size={16} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {item.media_type === 'image' ? (
                          <Camera size={14} className="text-blue-400" />
                        ) : (
                          <Video size={14} className="text-green-400" />
                        )}
                        <span className="text-xs text-gray-400">{item.category}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.view_count} views
                      </div>
                    </div>
                    
                    {item.title && (
                      <div className="font-medium text-sm mb-1 line-clamp-1">
                        {item.title}
                      </div>
                    )}
                    
                    {item.description && (
                      <div className="text-xs text-gray-300 line-clamp-2 mb-2">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}