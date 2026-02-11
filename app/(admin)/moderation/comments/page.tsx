// app/(admin)/moderation/comments/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MessageCircle, AlertCircle, Check, X, User, Filter, Search, Shield } from 'lucide-react'

interface ModerationComment {
  id: string
  content: string
  moderation_status: string
  toxicity_score: number
  has_profanity: boolean
  has_hate_speech: boolean
  has_racism: boolean
  moderation_notes: string | null
  created_at: string
  user_display_name: string
  user_profile_image_url: string | null
  portfolio_items:Array<{
    title: string
  }>
}

export default function CommentModerationPage() {
  const [comments, setComments] = useState<ModerationComment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
  }, [filter])

  const loadComments = async () => {
    try {
      let query = supabase
        .from('portfolio_comments')
        .select(`
          id,
          content,
          moderation_status,
          toxicity_score,
          has_profanity,
          has_hate_speech,
          has_racism,
          moderation_notes,
          created_at,
          user_display_name,
          user_profile_image_url,
          portfolio_items (
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('moderation_status', filter)
      }

      const { data } = await query
      setComments(data || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (commentId: string) => {
    setProcessing(commentId)
    
    try {
      const { error } = await supabase
        .from('portfolio_comments')
        .update({
          moderation_status: 'approved',
          is_approved: true,
          is_flagged: false
        })
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (commentId: string, permanentDelete = false) => {
    setProcessing(commentId)
    
    try {
      if (permanentDelete) {
        // Permanent delete
        const { error } = await supabase
          .from('portfolio_comments')
          .delete()
          .eq('id', commentId)

        if (error) throw error
      } else {
        // Mark as rejected (soft delete)
        const { error } = await supabase
          .from('portfolio_comments')
          .update({
            moderation_status: 'rejected',
            is_approved: false
          })
          .eq('id', commentId)

        if (error) throw error
      }

      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
    } finally {
      setProcessing(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'flagged': return 'text-orange-600 bg-orange-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50'
    if (score >= 0.5) return 'text-orange-600 bg-orange-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  const filteredComments = comments.filter(comment => {
    if (!search) return true
    return comment.content.toLowerCase().includes(search.toLowerCase()) ||
           comment.user_display_name.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Comment Moderation</h1>
              <p className="text-gray-600">
                Review and moderate user comments for inappropriate content
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={24} className="text-green-600" />
              <span className="text-sm text-gray-600">
                {filteredComments.length} comments to review
              </span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search comments or users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {(['all', 'pending', 'flagged', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg capitalize ${filter === status ? 'bg-green-900 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredComments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <Check size={48} className="text-green-600 mx-auto mb-4" />
            <div className="text-gray-900 font-medium mb-2">All caught up!</div>
            <p className="text-gray-600">No comments need moderation right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {comment.user_profile_image_url ? (
                            <img
                              src={comment.user_profile_image_url}
                              alt={comment.user_display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={24} className="text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {comment.user_display_name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Commented on "{comment.portfolio_items[0]?.title || 'unknown portfolio'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(comment.moderation_status)}`}>
                            {comment.moderation_status}
                          </span>
                          {comment.toxicity_score > 0 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(comment.toxicity_score)}`}>
                              Toxicity: {(comment.toxicity_score * 100).toFixed(0)}%
                            </span>
                          )}
                          {comment.has_profanity && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                              Profanity
                            </span>
                          )}
                          {comment.has_hate_speech && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600">
                              Hate Speech
                            </span>
                          )}
                          {comment.has_racism && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              Racism
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="mb-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                    
                    {comment.moderation_notes && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800">
                            <div className="font-medium">Moderation Notes:</div>
                            <div>{comment.moderation_notes}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    {comment.moderation_status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(comment.id)}
                        disabled={processing === comment.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check size={16} />
                        <span>{processing === comment.id ? 'Processing...' : 'Approve'}</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleReject(comment.id, false)}
                      disabled={processing === comment.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <X size={16} />
                      <span>{processing === comment.id ? 'Processing...' : 'Reject'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleReject(comment.id, true)}
                      disabled={processing === comment.id}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}