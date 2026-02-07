'use client'

import { useState, useEffect } from 'react'
import { Heart, Bookmark, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getSessionId, getGuestLikes, saveGuestLikes } from '@/lib/utils/LikeSave'

interface LikeSaveButtonsProps {
  itemId: string
  initialLikeCount?: number
  initialSaveCount?: number
  size?: 'sm' | 'md' | 'lg'
  showCounts?: boolean
}

export default function LikeSaveButtons({ 
  itemId, 
  initialLikeCount = 0, 
  initialSaveCount = 0,
  size = 'md',
  showCounts = true
}: LikeSaveButtonsProps) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [saveCount, setSaveCount] = useState(initialSaveCount)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Get user session on mount
  useEffect(() => {
    checkUserSession()
    
    // Check initial like/save status
    checkItemStatus()
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setIsLoggedIn(!!session?.user)
        if (session?.user) {
          checkItemStatus(session.user.id)
        } else {
          checkItemStatus()
        }
      }
    )
    
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [itemId])

  async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    setIsLoggedIn(!!session?.user)
    return session?.user
  }

  async function checkItemStatus(userId?: string) {
    try {
      const sessionId = getSessionId()
      
      if (userId) {
        // Check database for logged-in user
        const { data, error } = await supabase
          .rpc('get_user_item_status', {
            p_item_id: itemId,        // CHANGED: p_item_id
            p_user_id: userId,        // CHANGED: p_user_id
            p_session_id: sessionId   // CHANGED: p_session_id
          })
        
        if (error) throw error
        
        if (data && data.length > 0) {
          setLiked(data[0].liked)
          setSaved(data[0].saved)
          setLikeCount(data[0].like_count)
          setSaveCount(data[0].save_count)
        }
      } else {
        // Check localStorage for guest
        const guestLikes = getGuestLikes()
        setLiked(guestLikes.includes(itemId))
        
        // Get counts from database
        const { data, error } = await supabase
          .rpc('get_user_item_status', {
            p_item_id: itemId,        // CHANGED: p_item_id
            p_session_id: sessionId   // CHANGED: p_session_id
          })
        
        if (error) throw error
        
        if (data && data.length > 0) {
          setLikeCount(data[0].like_count)
          setSaveCount(data[0].save_count)
        }
      }
    } catch (error) {
    }
  }

  async function handleLike() {
    if (loading) return
    
    setLoading(true)
    try {
      if (isLoggedIn && user) {
        // Logged-in user: use database
        const { data, error } = await supabase
          .rpc('handle_item_like', {
            p_item_id: itemId,    // CHANGED: p_item_id
            p_user_id: user.id,   // CHANGED: p_user_id
            p_session_id: null    // CHANGED: p_session_id
          })
        
        if (error) throw error
        
        if (data) {
          setLiked(data.user_liked)
          setLikeCount(data.like_count)
        }
      } else {
        // Guest: use localStorage
        const guestLikes = getGuestLikes()
        let newLiked = false
        
        if (guestLikes.includes(itemId)) {
          // Unlike
          const newLikes = guestLikes.filter(id => id !== itemId)
          saveGuestLikes(newLikes)
          setLiked(false)
          setLikeCount(prev => Math.max(0, prev - 1))
        } else {
          // Like
          guestLikes.push(itemId)
          saveGuestLikes(guestLikes)
          setLiked(true)
          setLikeCount(prev => prev + 1)
          newLiked = true
        }
        
        // Also update in database for guest tracking
        const sessionId = getSessionId()
        await supabase.rpc('handle_item_like', {
          p_item_id: itemId,        // CHANGED: p_item_id
          p_session_id: sessionId   // CHANGED: p_session_id
        })
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (loading || !isLoggedIn || !user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('handle_item_save', {
          p_item_id: itemId,    // CHANGED: p_item_id
          p_user_id: user.id    // CHANGED: p_user_id
        })
      
      if (error) throw error
      
      if (data) {
        setSaved(data.user_saved)
        setSaveCount(data.save_count)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  return (
    <div className="flex items-center gap-4">
      {/* Like Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={loading}
          className={`flex items-center justify-center rounded-full transition-all ${sizeClasses[size]} ${
            liked 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          {loading ? (
            <Loader2 size={iconSizes[size]} className="animate-spin" />
          ) : (
            <Heart 
              size={iconSizes[size]} 
              className={liked ? 'fill-current' : ''}
            />
          )}
        </button>
        
        {showCounts && likeCount > 0 && (
          <span className="text-sm text-gray-600 min-w-5 text-center">
            {likeCount}
          </span>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !isLoggedIn}
          className={`flex items-center justify-center rounded-full transition-all ${sizeClasses[size]} ${
            saved 
              ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30' 
              : isLoggedIn
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-label={saved ? 'Unsave' : 'Save'}
          title={!isLoggedIn ? 'Login to save items' : saved ? 'Remove from saved' : 'Save item'}
        >
          {loading ? (
            <Loader2 size={iconSizes[size]} className="animate-spin" />
          ) : (
            <Bookmark 
              size={iconSizes[size]} 
              className={saved ? 'fill-current' : ''}
            />
          )}
        </button>
        
        {showCounts && saveCount > 0 && (
          <span className="text-sm text-gray-600 min-w-5 text-center">
            {saveCount}
          </span>
        )}
      </div>
    </div>
  )
}