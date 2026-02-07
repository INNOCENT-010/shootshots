// app/(admin)/featured/page.tsx - FIXED AUTH
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Star, Search, Filter, Check, X, Eye, Calendar, User, Loader2, Clock, AlertCircle, CheckCircle, Ban } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FeaturedRequest {
  id: string
  portfolio_item_id: string
  creator_id: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  admin_notes?: string
  admin_id?: string
  requested_at: string
  reviewed_at?: string
  featured_start_at?: string
  featured_end_at?: string
  portfolio_items: {
    id: string
    media_url: string
    media_type: 'image' | 'video'
    title?: string
    category: string
    is_featured: boolean
    creator_id: string
  }
  creator_profile: {
    id: string
    display_name: string
    subscription_tier: string
    featured_requests_available?: number
  }
}

export default function AdminFeaturedPage() {
  const [featuredRequests, setFeaturedRequests] = useState<FeaturedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [user, setUser] = useState<any>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{[key: string]: string}>({})
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadFeaturedRequests()
    }
  }, [user])

  async function checkAuth() {
    try {
      setAuthLoading(true)
      
      // Check if user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        router.push('/login?redirect=/featured')
        return
      }
      
      if (!session?.user) {
        router.push('/login?redirect=/featured')
        return
      }
      
      setUser(session.user)
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()
      
      if (profileError) {
        // If profile doesn't exist or error, redirect to home
        router.push('/')
        return
      }
      
      if (!profile?.is_admin) {
        router.push('/')
        return
      }
      
      
    } catch (error) {
      router.push('/')
    } finally {
      setAuthLoading(false)
    }
  }

  async function loadFeaturedRequests() {
    try {
      setLoading(true)
      
      // First, let's test the query with a simpler version
      
      // Try a simpler query first to debug
      const { data: simpleData, error: simpleError } = await supabase
        .from('featured_requests')
        .select(`
          *,
          portfolio_items (*),
          profiles!featured_requests_creator_id_fkey (
            id,
            display_name,
            subscription_tier,
            featured_requests_available
          )
        `)
        .order('requested_at', { ascending: false })
      
      if (simpleError) {
        
        // Try even simpler - just get featured_requests
        const { data: basicData, error: basicError } = await supabase
          .from('featured_requests')
          .select('*')
          .order('requested_at', { ascending: false })
          
        if (basicError) {
          throw basicError
        }
        
        // You'll need to manually fetch portfolio_items and profiles
        setFeaturedRequests([]) // Handle this case
        return
      }
      
      
      // Transform the data to match our interface
      const transformedData: FeaturedRequest[] = (simpleData || []).map(item => ({
        id: item.id,
        portfolio_item_id: item.portfolio_item_id,
        creator_id: item.creator_id,
        status: item.status,
        admin_notes: item.admin_notes,
        admin_id: item.admin_id,
        requested_at: item.requested_at,
        reviewed_at: item.reviewed_at,
        featured_start_at: item.featured_start_at,
        featured_end_at: item.featured_end_at,
        portfolio_items: Array.isArray(item.portfolio_items) 
          ? item.portfolio_items[0] 
          : item.portfolio_items || {
              id: '',
              media_url: '',
              media_type: 'image',
              title: 'Unknown',
              category: 'Unknown',
              is_featured: false,
              creator_id: item.creator_id
            },
        creator_profile: Array.isArray(item.profiles)
          ? item.profiles[0]
          : item.profiles || {
              id: item.creator_id,
              display_name: 'Unknown Creator',
              subscription_tier: 'free',
              featured_requests_available: 0
            }
      }))
      
      setFeaturedRequests(transformedData)
      
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestAction(requestId: string, action: 'approve' | 'reject') {
    if (processingId || !user) return
    
    setProcessingId(requestId)
    try {
      const request = featuredRequests.find(r => r.id === requestId)
      if (!request) throw new Error('Request not found')

      const notes = adminNotes[requestId] || ''
      const dbStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update featured request
      const { error: updateError } = await supabase
        .from('featured_requests')
        .update({
          status: dbStatus,
          admin_id: user.id,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          featured_start_at: dbStatus === 'approved' ? new Date().toISOString() : null,
          featured_end_at: dbStatus === 'approved' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .eq('id', requestId)

      if (updateError) throw updateError
      
      // Update portfolio item
      const { error: itemError } = await supabase
        .from('portfolio_items')
        .update({
          is_featured: dbStatus === 'approved',
          featured_at: dbStatus === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.portfolio_item_id)

      if (itemError) throw itemError
      
      // If approved, decrement creator's feature requests
      if (dbStatus === 'approved') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('featured_requests_available')
          .eq('id', request.creator_id)
          .single()
        
        const currentCount = profile?.featured_requests_available || 0
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            featured_requests_available: Math.max(0, currentCount - 1),
            updated_at: new Date().toISOString()
          })
          .eq('id', request.creator_id)
        
        if (profileError) throw profileError
      }
      
      // Refresh data
      await loadFeaturedRequests()
      
      setAdminNotes(prev => ({ ...prev, [requestId]: '' }))
      
    } catch (error) {
      alert('Failed to process request. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = featuredRequests.filter(request => {
    if (filter !== 'all' && request.status !== filter) return false
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        request.portfolio_items?.title?.toLowerCase().includes(query) ||
        request.portfolio_items?.category.toLowerCase().includes(query) ||
        request.creator_profile?.display_name?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      case 'expired': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2">Loading featured requests...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Featured Requests</h1>
          <p className="text-gray-400">Approve or reject requests for featured placement</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by creator, title, category..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? status === 'pending' ? 'bg-yellow-600' :
                      status === 'approved' ? 'bg-green-600' :
                      status === 'rejected' ? 'bg-red-600' :
                      'bg-gray-700'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Debug info */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredRequests.length} requests (Filter: {filter})
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-xl">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No requests found</h3>
              <p className="text-gray-400">
                {filter === 'pending' 
                  ? 'No pending featured requests'
                  : 'No requests match your filters'
                }
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-gray-900 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Content Preview */}
                  <div className="lg:w-1/4">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-800 mb-3">
                      {request.portfolio_items?.media_type === 'image' ? (
                        <img
                          src={request.portfolio_items.media_url}
                          alt={request.portfolio_items.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="text-gray-500">VIDEO</div>
                        </div>
                      )}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(request.status)}`}>
                      {request.status === 'pending' && <Clock size={14} />}
                      {request.status === 'approved' && <CheckCircle size={14} />}
                      {request.status === 'rejected' && <Ban size={14} />}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      Plan: {request.creator_profile?.subscription_tier?.toUpperCase() || 'FREE'}
                    </div>
                  </div>

                  {/* Center: Details */}
                  <div className="lg:w-2/4">
                    <h3 className="text-xl font-bold mb-2">
                      {request.portfolio_items?.title || 'Untitled'}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      Category: {request.portfolio_items?.category}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div>
                          <div className="font-medium">{request.creator_profile?.display_name}</div>
                          <div className="text-sm text-gray-400">
                            {request.creator_profile?.subscription_tier === 'free' ? 'Free' : 'Premium'} Creator
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Admin Notes</label>
                      {request.status === 'pending' ? (
                        <textarea
                          value={adminNotes[request.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({
                            ...prev,
                            [request.id]: e.target.value
                          }))}
                          placeholder="Add notes for this request..."
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-white resize-none"
                          rows={3}
                        />
                      ) : (
                        <div className="px-4 py-3 bg-gray-800 rounded-lg">
                          {request.admin_notes || 'No notes provided'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:w-1/4">
                    {request.status === 'pending' ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => handleRequestAction(request.id, 'approve')}
                          disabled={processingId === request.id}
                          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={16} />
                              Approve
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleRequestAction(request.id, 'reject')}
                          disabled={processingId === request.id}
                          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                          {processingId === request.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <X size={16} />
                              Reject
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">Decision Made</div>
                        <div className="text-sm">
                          {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}