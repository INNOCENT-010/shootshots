// lib/utils/userType.ts
import { supabase } from '@/lib/supabase/client'

export async function getUserType(userId: string): Promise<'creator' | 'client'> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('creator_type')
      .eq('id', userId)
      .single()

    // If user has a creator_type set, they're a creator
    if (profile?.creator_type) {
      return 'creator'
    }
    
    return 'client'
  } catch (error) {
    // If no profile or error, default to client
    return 'client'
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_image_url, display_name, creator_type')
      .eq('id', userId)
      .single()
    
    return profile
  } catch (error) {
    return null
  }
}