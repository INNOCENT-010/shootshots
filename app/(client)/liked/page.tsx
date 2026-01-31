// app/(client)/liked/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Heart, Grid, List, MapPin, Clock, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface LikedItem {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  title?: string
  description?: string
  category: string
  created_at: string
  like_count: number
  save_count: number
  profiles: {
    id: string
    display_name: string
    location?: string
    profile_image_url?: string
    creator_type?: string
  }
}

export default function LikedPage() {
  const [likedItems, setLikedItems] = useState<LikedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadLikedItems()
    }
  }, [user])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      router.push('/login?redirect=/liked')
      return
    }
    
    setUser(session.user)
  }

  async function loadLikedItems() {
    if (!user) return
    
    try {
      // Get liked item IDs
      const { data: actions, error: actionsError } = await supabase
        .from('client_actions')
        .select('portfolio_item_id, created_at')
        .eq('client_id', user.id)
        .eq('action_type', 'like')
        .order('created_at', { ascending: false })

      if (actionsError) throw actionsError

      if (!actions || actions.length === 0) {
        setLikedItems([])
        setLoading(false)
        return
      }

      const itemIds = actions.map(action => action.portfolio_item_id)
      
      // Get the actual portfolio items
      const { data: items, error: itemsError } = await supabase
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
        .in('id', itemIds)
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      setLikedItems(items || [])
    } catch (error) {
      console.error('Error loading liked items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlike(itemId: string) {
    if (!user) return
    
    try {
      const { error } = await supabase.rpc('handle_item_like', {
        p_item_id: itemId,
        p_user_id: user.id
      })
      
      if (error) throw error
      
      // Remove from local state
      setLikedItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error unliking item:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="text-gray-400">Loading liked items...</div>
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
                <Heart className="text-red-500" size={24} />
                Liked Items
              </h1>
              <p className="text-gray-400 text-sm">
                {likedItems.length} {likedItems.length === 1 ? 'item' : 'items'} liked
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-sm text-gray-300 hover:text-white"
              >
                ← Back to Home
              </Link>
              
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                  aria-label="Grid view"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {likedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-gray-800 rounded-full mb-4">
              <Heart size={48} className="text-gray-600" />
            </div>
            <h2 className="text-xl font-medium mb-2">No liked items yet</h2>
            <p className="text-gray-400 mb-6">
              When you like items, they'll appear here
            </p>
            <Link
              href="/browse"
              className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Browse Portfolio
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {likedItems.map((item) => (
              <LikedItemCard 
                key={item.id} 
                item={item} 
                onUnlike={() => handleUnlike(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {likedItems.map((item) => (
              <LikedItemList 
                key={item.id} 
                item={item} 
                onUnlike={() => handleUnlike(item.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function LikedItemCard({ item, onUnlike }: { item: LikedItem, onUnlike: () => void }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden hover:opacity-95 transition-opacity">
      <div className="relative aspect-square">
        {item.media_type === 'image' ? (
          <img
            src={item.media_url}
            alt={item.title || 'Portfolio'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <video
            src={item.media_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link 
            href={`/creator/${item.profiles.id}`}
            className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 hover:opacity-80"
          >
            {item.profiles.profile_image_url ? (
              <img
                src={item.profiles.profile_image_url}
                alt={item.profiles.display_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="text-xs">
                {item.profiles.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link 
              href={`/creator/${item.profiles.id}`}
              className="font-medium text-sm hover:underline line-clamp-1"
            >
              {item.profiles.display_name}
            </Link>
            <div className="text-xs text-gray-400">
              {item.profiles.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {item.profiles.location}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onUnlike}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remove from liked"
          >
            <Heart size={16} className="fill-current" />
          </button>
        </div>

        <div className="mb-3">
          {item.title && (
            <div className="font-semibold text-sm mb-1 line-clamp-1">
              {item.title}
            </div>
          )}
          {item.description && (
            <div className="text-xs text-gray-300 line-clamp-2">
              {item.description}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-block bg-white/10 px-2 py-1 rounded text-xs">
            {item.category}
          </span>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Heart size={10} className="text-red-500" />
              <span>{item.like_count}</span>
            </div>
            <div className="text-xs text-gray-400">
              <Clock size={10} className="inline mr-1" />
              {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LikedItemList({ item, onUnlike }: { item: LikedItem, onUnlike: () => void }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex">
        <div className="w-24 h-24 flex-shrink-0">
          {item.media_type === 'image' ? (
            <img
              src={item.media_url}
              alt={item.title || 'Portfolio'}
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
        </div>
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Link 
                  href={`/creator/${item.profiles.id}`}
                  className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0 hover:opacity-80"
                >
                  {item.profiles.profile_image_url ? (
                    <img
                      src={item.profiles.profile_image_url}
                      alt={item.profiles.display_name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="text-xs">
                      {item.profiles.display_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <Link 
                  href={`/creator/${item.profiles.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {item.profiles.display_name}
                </Link>
                {item.profiles.location && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={10} />
                    {item.profiles.location}
                  </span>
                )}
              </div>
              
              {item.title && (
                <div className="font-semibold text-sm mb-1">
                  {item.title}
                </div>
              )}
              
              {item.description && (
                <div className="text-sm text-gray-300 line-clamp-1">
                  {item.description}
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-2">
                <span className="inline-block bg-white/10 px-2 py-1 rounded text-xs">
                  {item.category}
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Heart size={10} className="text-red-500" />
                  <span>{item.like_count} likes</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <button
              onClick={onUnlike}
              className="text-gray-400 hover:text-red-500 transition-colors ml-4"
              title="Remove from liked"
            >
              <Heart size={16} className="fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}