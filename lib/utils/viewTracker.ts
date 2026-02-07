// lib/utils/viewTracker.ts - Platform-style implementation
import { supabase } from '@/lib/supabase/client'

export async function trackView(itemId: string): Promise<boolean> {
  const now = Date.now()
  
  // Platform-style settings
  const VIEW_COOLDOWN = 5000 // 5 seconds minimum between counts (prevents F5 spam)
  const SESSION_RESET = 30 * 60 * 1000 // 30 minutes = new session
  const MAX_VIEWS_PER_SESSION = 3 // Max 3 counts per session per item
  
  if (typeof window !== 'undefined') {
    // Get or create session
    let sessionStart = localStorage.getItem('app_session_start')
    if (!sessionStart) {
      sessionStart = now.toString()
      localStorage.setItem('app_session_start', sessionStart)
    }
    
    // Check if session expired (30 minutes)
    if (now - parseInt(sessionStart) > SESSION_RESET) {
      // New session - reset all tracking
      localStorage.setItem('app_session_start', now.toString())
      // Clear view tracking for fresh session
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('view_') || key.startsWith('viewcount_')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    // Check rapid refresh (5-second cooldown)
    const lastViewKey = `view_time_${itemId}`
    const lastViewTime = localStorage.getItem(lastViewKey)
    
    if (lastViewTime && (now - parseInt(lastViewTime) < VIEW_COOLDOWN)) {
      return false // Too soon since last count
    }
    
    // Check view count this session (max 3 per session)
    const viewCountKey = `viewcount_${itemId}`
    let viewCount = parseInt(localStorage.getItem(viewCountKey) || '0')
    
    if (viewCount >= MAX_VIEWS_PER_SESSION) {
      return false
    }
    
    // Increment session view count
    viewCount++
    localStorage.setItem(viewCountKey, viewCount.toString())
    
    // Update last view time
    localStorage.setItem(lastViewKey, now.toString())
  }
  
  // Update database
  
  try {
    // Try RPC function first
    const { error } = await supabase.rpc(
      'increment_view_count',
      { item_id: itemId }
    )
    
    if (error) {
      
      // Fallback: Direct update
      const { error: directError } = await supabase
        .from('portfolio_items')
        .update({ view_count: () => 'view_count + 1' })
        .eq('id', itemId)
      
      if (directError) {
        return false
      }
    }
    
    return true
    
  } catch (error) {
    return false
  }
}

// Optional: Track unique viewers for analytics
export async function trackUniqueView(itemId: string, userId?: string): Promise<boolean> {
  const now = Date.now()
  const UNIQUE_VIEW_DURATION = 24 * 60 * 60 * 1000 // 24 hours for unique view
  
  if (userId) {
    // Logged-in user: Track unique views in database
    try {
      const { error } = await supabase
        .from('portfolio_views')
        .insert({
          portfolio_item_id: itemId,
          viewer_id: userId,
          viewed_at: new Date().toISOString()
        })
      
      if (!error) {
      }
    } catch (error) {
    }
  } else {
    // Anonymous user: Use localStorage
    if (typeof window !== 'undefined') {
      const uniqueKey = `unique_view_${itemId}`
      const lastUniqueView = localStorage.getItem(uniqueKey)
      
      if (!lastUniqueView || (now - parseInt(lastUniqueView) > UNIQUE_VIEW_DURATION)) {
        localStorage.setItem(uniqueKey, now.toString())
      }
    }
  }
  
  // Still count the view
  return await trackView(itemId)
}