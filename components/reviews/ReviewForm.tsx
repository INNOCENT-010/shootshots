// components/reviews/ReviewForm.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { Star, Send, X, AlertCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ReviewFormProps {
  creatorId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ReviewForm({ creatorId, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (!creatorId) {
      setError('Invalid creator information')
      return
    }

    // Check if user is logged in
    if (!currentUserId) {
      setError('Please sign in to submit a review')
      return
    }

    // Check if user is trying to review themselves
    if (currentUserId === creatorId) {
      setError('You cannot review yourself')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      // Submit the review - RLS will prevent duplicates and self-reviews
      const { data, error: submitError } = await supabase
        .from('creator_reviews')
        .insert({
          creator_id: creatorId,
          reviewer_id: currentUserId,
          rating: rating,
          comment: comment.trim() || null,
          is_approved: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (submitError) {
        // Handle specific errors
        if (submitError.code === '23505') {
          setError('You have already reviewed this creator')
        } else if (submitError.code === '23514') {
          setError('You cannot review yourself')
        } else if (submitError.code === '42501') {
          setError('Permission denied. Please make sure you are logged in.')
        } else {
          setError(submitError.message || 'Failed to submit review')
        }
        throw submitError
      }

      // Check database state BEFORE update
      const { data: beforeProfile } = await supabase
        .from('profiles')
        .select('avg_rating, total_reviews')
        .eq('id', creatorId)
        .single()

      // Update creator's rating via RPC
      const { data: updateResult, error: updateError } = await supabase.rpc(
        'force_update_creator_rating',
        { p_creator_id: creatorId }
      )

      // Check database state AFTER RPC update
      const { data: afterProfile } = await supabase
        .from('profiles')
        .select('avg_rating, total_reviews')
        .eq('id', creatorId)
        .single()

      // If update didn't work, do DIRECT update
      if (afterProfile && beforeProfile && afterProfile.total_reviews === beforeProfile.total_reviews) {
        // Calculate manually
        const { data: reviews } = await supabase
          .from('creator_reviews')
          .select('rating')
          .eq('creator_id', creatorId)
          .eq('is_approved', true)
          .eq('is_flagged', false)

        const totalReviews = reviews?.length || 0
        const avgRating = reviews && reviews.length > 0 
          ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2))
          : 0

        // Update directly
        const { error: directError } = await supabase
          .from('profiles')
          .update({
            avg_rating: avgRating,
            total_reviews: totalReviews,
            updated_at: new Date().toISOString()
          })
          .eq('id', creatorId)

        // Verify final state
        const { data: finalProfile } = await supabase
          .from('profiles')
          .select('avg_rating, total_reviews')
          .eq('id', creatorId)
          .single()
      }

      // Notify everyone that needs to refresh
      window.dispatchEvent(new CustomEvent('review-submitted', {
        detail: { creatorId }
      }))

      // Show success state
      setSuccess(true)
      setComment('')
      setRating(0)

      // Auto-hide after 2 seconds and call success callback
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 2000)

    } catch (error: any) {
      if (!error.message?.includes('already reviewed')) {
        setError(error.message || 'Failed to submit review. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (forDisplay: boolean = false) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => !forDisplay && setRating(star)}
        onMouseEnter={() => !forDisplay && setHoverRating(star)}
        onMouseLeave={() => !forDisplay && setHoverRating(0)}
        className="p-1 focus:outline-none disabled:opacity-50"
        disabled={forDisplay || submitting || success}
      >
        <Star
          size={28}
          className={`${
            star <= (forDisplay ? rating : (hoverRating || rating))
              ? 'fill-yellow-500 text-yellow-500'
              : 'text-gray-300'
          } transition-colors`}
        />
      </button>
    ))
  }

  // Success state
  if (success) {
    return (
      <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Review Published Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            Your review is now visible on the creator's profile.
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={`${
                    star <= rating
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-700 font-medium">{rating}.0</span>
          </div>
          {comment && (
            <p className="text-gray-700 italic text-sm mb-4">"{comment}"</p>
          )}
          <div className="text-sm text-gray-500">
            This message will close automatically...
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Leave a Review</h3>
        
        {/* Authentication Status */}
        {!currentUserId && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-600" />
              <div className="text-sm text-yellow-800">
                Please sign in to submit a review
              </div>
            </div>
          </div>
        )}

        {/* Star Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Your Rating *
          </label>
          <div className="flex items-center gap-1">
            {renderStars()}
            <span className="ml-3 text-sm text-gray-600">
              {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Your Review (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none text-gray-900 disabled:opacity-50"
            rows={4}
            placeholder="Share your experience with this creator..."
            maxLength={500}
            disabled={submitting || !currentUserId}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
              disabled={submitting}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          )}
          
          <button
            type="submit"
            disabled={submitting || rating === 0 || !currentUserId}
            className="flex items-center gap-2 px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Publish Review</span>
              </>
            )}
          </button>
        </div>

        {/* Info Text */}
        <div className="mt-4 text-xs text-gray-500">
          Your review will be published immediately and visible to everyone.
        </div>
      </div>
    </form>
  )
}