import { supabase } from '@/lib/supabase/client'

export async function getHomeFeedItems(limit: number = 20) {
  // Get featured items first (paid priority)
  const { data: featured } = await supabase
    .from('portfolio_items')
    .select('*, creator:profiles(*)')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get trending items (high view count recently)
  const { data: trending } = await supabase
    .from('portfolio_items')
    .select('*, creator:profiles(*)')
    .order('view_count', { ascending: false })
    .limit(10)

  // Get recent items
  const { data: recent } = await supabase
    .from('portfolio_items')
    .select('*, creator:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(15)

  // Combine and deduplicate
  const allItems = [...(featured || []), ...(trending || []), ...(recent || [])]
  const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values())

  // Simple shuffle
  const shuffled = uniqueItems.sort(() => Math.random() - 0.5)

  return shuffled.slice(0, limit)
}

export async function trackView(itemId: string, clientId?: string) {
  // Increment view count
  await supabase.rpc('increment_view_count', { item_id: itemId })

  // Record view for logged-in clients
  if (clientId) {
    await supabase
      .from('client_actions')
      .upsert({
        client_id: clientId,
        portfolio_item_id: itemId,
        action_type: 'view',
      }, {
        onConflict: 'client_id,portfolio_item_id,action_type'
      })
  }
}