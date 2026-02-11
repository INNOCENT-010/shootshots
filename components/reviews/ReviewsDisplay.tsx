// components/reviews/ReviewsDisplay.tsx - UPDATED VERSION
'use client'

import { useState, useEffect } from 'react'
import { Star, Flag, MoreVertical, Check, X, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  is_flagged: boolean
  profiles:   Array<{
    display_name: string
    profile_image_url: string | null
  }>
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
          created_at,
          is_flagged,
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
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-900"></div>
        <div className="text-gray-600 mt-2">Loading reviews...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
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
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {review.profiles[0]?.profile_image_url ? (
                      <img
                        src={review.profiles[0]?.profile_image_url}
                        alt={review.profiles[0]?.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-600 font-medium">
                        {review.profiles[0]?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {review.profiles[0]?.display_name || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating, 'sm')}
                      <span className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Flag button (only for creator) */}
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

              {review.comment && (
                <p className="text-gray-700 mt-3">{review.comment}</p>
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