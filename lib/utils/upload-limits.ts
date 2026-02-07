import { supabase } from '@/lib/supabase/client'

export async function checkUploadLimit(userId: string): Promise<{
  canUpload: boolean
  currentCount: number
  maxLimit: number
  reason?: string
}> {
  // Get user's current upload count
  const { count, error: countError } = await supabase
    .from('portfolio_items')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)

  if (countError) {
    throw new Error('Failed to check upload limit')
  }

  // Get user's premium status and limit
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_premium, portfolio_limit')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Failed to fetch user profile')
  }

  const maxLimit = profile?.portfolio_limit || 5
  const currentCount = count || 0

  if (!profile?.is_premium && currentCount >= maxLimit) {
    return {
      canUpload: false,
      currentCount,
      maxLimit,
      reason: 'Free tier limit reached (5 items). Upgrade to premium for unlimited uploads.'
    }
  }

  return {
    canUpload: true,
    currentCount,
    maxLimit
  }
}
