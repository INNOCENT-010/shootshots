// lib/utils/likeSave.ts
import { supabase } from '@/lib/supabase/client'

// Generate or get session ID for guest users
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('shootshots_session_id')
  
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2) + '_' + Date.now()
    localStorage.setItem('shootshots_session_id', sessionId)
  }
  
  return sessionId
}

// Get guest likes from localStorage
export function getGuestLikes(): string[] {
  if (typeof window === 'undefined') return []
  
  const likes = localStorage.getItem('shootshots_guest_likes')
  return likes ? JSON.parse(likes) : []
}

// Save guest likes to localStorage
export function saveGuestLikes(likes: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('shootshots_guest_likes', JSON.stringify(likes))
}

// Migrate guest likes to user account
export async function migrateGuestLikesToUser(userId: string): Promise<void> {
  const sessionId = getSessionId()
  const guestLikes = getGuestLikes()
  
  if (guestLikes.length === 0) return
  
  try {
    // Add all guest likes to user's account
    for (const itemId of guestLikes) {
      await supabase.rpc('handle_item_like', {
        item_id: itemId,
        user_id: userId,
        session_id: sessionId
      })
    }
    
    // Clear guest likes
    saveGuestLikes([])
    
    // Clear session ID
    localStorage.removeItem('shootshots_session_id')
  } catch (error) {
  }
}

// Check if user is logged in
export function isUserLoggedIn(): boolean {
  // We'll check Supabase session
  return false // We'll implement this after getting session
}