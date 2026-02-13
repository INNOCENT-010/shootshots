// components/reviews/ReviewsDisplay.tsx
'use client'

import { useState, useEffect } from 'react'
import { Star, Flag, MoreVertical, Check, X, AlertCircle, Mail, User as UserIcon, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import ReviewForm from './ReviewForm'

interface Review {
  id: string
  creator_id: string
  rating: number
  comment: string | null
  created_at: string
  edited_at: string | null
  is_flagged: boolean
  reviewer_id: string | null
  reviewer_email: string | null
  reviewer_name: string | null
  reviewer_type: 'authenticated' | 'anonymous'
  edit_token: string | null
  profiles?: {
    display_name: string
    profile_image_url: string | null
  }[]
}

interface ReviewsDisplayProps {
  creatorId: string
  showHeader?: boolean
  limit?: number
}

export default function ReviewsDisplay({ creatorId, showHeader = true, limit = 5 }: ReviewsDisplayProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [flaggedReviewId, setFlaggedReviewId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showEditPrompt, setShowEditPrompt] = useState(false)
  const [editEmail, setEditEmail] = useState('')
  const [editableReviews, setEditableReviews] = useState<Review[]>([])

  // Get current user email from localStorage for anonymous edits
  useEffect(() => {
    const storedEmail = localStorage.getItem(`reviewer_email_${creatorId}`)
    if (storedEmail) {
      setUserEmail(storedEmail)
    }
  }, [creatorId])

  // Check for reviews editable by this email
  useEffect(() => {
    if (userEmail) {
      const checkEditableReviews = async () => {
        const { data } = await supabase
          .from('creator_reviews')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('reviewer_email', userEmail)
          .eq('reviewer_type', 'anonymous')
          .order('created_at', { ascending: false })
        
        if (data && data.length > 0) {
          setEditableReviews(data)
        }
      }
      checkEditableReviews()
    }
  }, [creatorId, userEmail])

  useEffect(() => {
    if (creatorId) {
      loadReviews()
      loadRatingStats()
    }
  }, [creatorId, showAll, sortBy])

  const loadReviews = async () => {
    try {
      let query = supabase
        .from('creator_reviews')
        .select(`
          id,
          rating,
          comment,
          creator_id,
          created_at,
          edited_at,
          is_flagged,
          reviewer_id,
          reviewer_email,
          reviewer_name,
          reviewer_type,
          edit_token,
          profiles!creator_reviews_reviewer_id_fkey(
            display_name,
            profile_image_url
          )
        `)
        .eq('creator_id', creatorId)
        .eq('is_flagged', false)

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'highest':
          query = query.order('rating', { ascending: false })
          break
        case 'lowest':
          query = query.order('rating', { ascending: true })
          break
      }

      // Apply limit
      const { data } = await query.limit(showAll ? 50 : limit)

      setReviews(data || [])
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRatingStats = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avg_rating, total_reviews')
        .eq('id', creatorId)
        .single()

      if (profile) {
        setAverageRating(profile.avg_rating || 0)
        setTotalReviews(profile.total_reviews || 0)
      }
    } catch (error) {
      console.error('Error loading rating stats:', error)
    }
  }

  const handleFlagReview = async (reviewId: string) => {
    if (!user || user.id !== creatorId) return // Only creator can flag

    try {
      const { error } = await supabase
        .from('creator_reviews')
        .update({
          is_flagged: true,
          flag_reason: 'Creator flagged as inappropriate',
          flagged_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      if (error) throw error

      // Remove from local state
      setReviews(reviews.filter(review => review.id !== reviewId))
      setFlaggedReviewId(null)
      
      // Refresh stats
      await loadRatingStats()
      
      alert('Review flagged successfully. It will be reviewed by the team.')
    } catch (error) {
      alert('Failed to flag review. Please try again.')
    }
  }

  const handleEditClick = (review: Review) => {
    if (review.reviewer_type === 'authenticated' && user?.id === review.reviewer_id) {
      // Authenticated user editing their own review
      setEditingReview(review)
    } else if (review.reviewer_type === 'anonymous') {
      // Anonymous user - check if they have the edit token or email
      const storedToken = localStorage.getItem(`review_edit_${review.creator_id}`)
      if (storedToken === review.edit_token) {
        setEditingReview(review)
      } else if (userEmail === review.reviewer_email) {
        setEditingReview(review)
      } else {
        // Prompt for email
        setEditEmail('')
        setShowEditPrompt(true)
        // Store the review ID to edit after email verification
        localStorage.setItem('pending_edit_review', review.id)
      }
    }
  }

  const verifyEmailForEdit = async () => {
    if (!editEmail) return
    
    const reviewId = localStorage.getItem('pending_edit_review')
    if (!reviewId) return

    const { data } = await supabase
      .from('creator_reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('reviewer_email', editEmail.toLowerCase())
      .single()

    if (data) {
      setEditingReview(data)
      setShowEditPrompt(false)
      localStorage.setItem(`reviewer_email_${creatorId}`, editEmail.toLowerCase())
      localStorage.setItem(`review_edit_${data.creator_id}`, data.edit_token || '')
      setUserEmail(editEmail.toLowerCase())
    } else {
      alert('No review found with that email')
    }
    
    localStorage.removeItem('pending_edit_review')
    setEditEmail('')
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const starSize = {
      sm: 14,
      md: 16,
      lg: 20
    }[size]

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={starSize}
            className={`${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getReviewerDisplayName = (review: Review) => {
    if (review.reviewer_type === 'authenticated' && review.profiles?.[0]?.display_name) {
      return review.profiles[0].display_name
    }
    if (review.reviewer_name) {
      return review.reviewer_name
    }
    return 'Anonymous'
  }

  const getReviewerInitial = (review: Review) => {
    const name = getReviewerDisplayName(review)
    return name.charAt(0).toUpperCase()
  }

  const getReviewerAvatar = (review: Review) => {
    if (review.reviewer_type === 'authenticated' && review.profiles?.[0]?.profile_image_url) {
      return review.profiles[0].profile_image_url
    }
    return null
  }

  const canEditReview = (review: Review) => {
    if (review.reviewer_type === 'authenticated') {
      return user?.id === review.reviewer_id
    } else {
      // Check localStorage for edit token or email
      const storedToken = localStorage.getItem(`review_edit_${review.creator_id}`)
      return storedToken === review.edit_token || userEmail === review.reviewer_email
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-900"></div>
        <div className="text-gray-600 mt-2">Loading reviews...</div>
      </div>
    )
  }

  if (editingReview) {
    return (
      <ReviewForm
        creatorId={creatorId}
        existingReview={{
          id: editingReview.id,
          rating: editingReview.rating,
          comment: editingReview.comment,
          reviewer_email: editingReview.reviewer_email || undefined,
          reviewer_name: editingReview.reviewer_name || undefined,
          edit_token: editingReview.edit_token || undefined
        }}
        onSuccess={() => {
          setEditingReview(null)
          loadReviews()
          loadRatingStats()
        }}
        onCancel={() => setEditingReview(null)}
      />
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Email verification prompt for editing */}
      {showEditPrompt && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <Mail size={16} className="text-blue-600 mt-1" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Verify your email to edit review
              </h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter the email you used to review"
                  className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={verifyEmailForEdit}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Verify
                </button>
                <button
                  onClick={() => setShowEditPrompt(false)}
                  className="px-4 py-2 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {showHeader && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Reviews</h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(averageRating), 'lg')}
                  <span className="ml-2 text-2xl font-bold text-gray-900">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <div className="text-gray-600">
                  • {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            {/* Sort Options */}
            {reviews.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-600"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            )}
          </div>

          {/* Your editable reviews reminder */}
          {editableReviews.length > 0 && !editingReview && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Edit2 size={16} className="text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    You have {editableReviews.length} review{editableReviews.length > 1 ? 's' : ''} from this creator
                  </p>
                  <div className="flex gap-2 mt-2">
                    {editableReviews.map(review => (
                      <button
                        key={review.id}
                        onClick={() => handleEditClick(review)}
                        className="text-xs px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Edit {review.rating}★ review
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="divide-y divide-gray-100">
        {reviews.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-600">No reviews yet</div>
            <p className="text-sm text-gray-500 mt-1">Be the first to review this creator</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {getReviewerAvatar(review) ? (
                      <img
                        src={getReviewerAvatar(review)!}
                        alt={getReviewerDisplayName(review)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-600 font-medium text-sm">
                        {getReviewerInitial(review)}
                      </div>
                    )}
                  </div>
                  
                  {/* Reviewer info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">
                        {getReviewerDisplayName(review)}
                      </div>
                      {review.reviewer_type === 'anonymous' && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          Guest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating, 'sm')}
                      <span className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                        {review.edited_at && (
                          <span className="ml-1 text-gray-400">(edited)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {/* Edit button - visible if user can edit this review */}
                  {canEditReview(review) && (
                    <button
                      onClick={() => handleEditClick(review)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Edit your review"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  {/* Flag button - only for creator */}
                  {user?.id === creatorId && !review.is_flagged && (
                    <div className="relative">
                      <button
                        onClick={() => setFlaggedReviewId(flaggedReviewId === review.id ? null : review.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Flag as inappropriate"
                      >
                        <Flag size={16} />
                      </button>
                      
                      {/* Flag confirmation */}
                      {flaggedReviewId === review.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="p-3">
                            <div className="text-sm font-medium text-gray-900 mb-2">
                              Flag this review?
                            </div>
                            <p className="text-xs text-gray-600 mb-3">
                              This will hide the review and notify the admin team.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFlagReview(review.id)}
                                className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                <Check size={14} className="inline mr-1" />
                                Flag
                              </button>
                              <button
                                onClick={() => setFlaggedReviewId(null)}
                                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                              >
                                <X size={14} className="inline mr-1" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Review comment */}
              {review.comment && (
                <p className="text-gray-700 mt-3 pl-[52px]">{review.comment}</p>
              )}

              {/* Anonymous reviewer note */}
              {review.reviewer_type === 'anonymous' && review.reviewer_email && (
                <div className="mt-2 pl-[52px] flex items-center gap-1">
                  <Mail size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {review.reviewer_email.replace(/(.{2})(.*)(?=@)/, 
                      (_, first, rest) => first + '*'.repeat(rest.length)
                    )}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Show More/Less */}
      {totalReviews > limit && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-green-800 hover:text-green-700 font-medium px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
          >
            {showAll ? 'Show fewer reviews' : `View all ${totalReviews} reviews`}
          </button>
        </div>
      )}
    </div>
  )
}