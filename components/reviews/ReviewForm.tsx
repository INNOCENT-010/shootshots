// components/reviews/ReviewForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Star, Send, X, AlertCircle, Check, Mail, User as UserIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ReviewFormProps {
  creatorId: string
  onSuccess?: () => void
  onCancel?: () => void
  existingReview?: {
    id: string
    rating: number
    comment: string | null
    reviewer_email?: string
    reviewer_name?: string
    edit_token?: string
  }
}

export default function ReviewForm({ creatorId, onSuccess, onCancel, existingReview }: ReviewFormProps) {
  // Rating state
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  
  // Auth state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Anonymous user fields
  const [reviewerName, setReviewerName] = useState(existingReview?.reviewer_name || '')
  const [reviewerEmail, setReviewerEmail] = useState(existingReview?.reviewer_email || '')
  
  // Form state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editToken] = useState(existingReview?.edit_token || crypto.randomUUID())
  const [isEditing] = useState(!!existingReview)

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      setIsAuthenticated(!!user)
      
      // If authenticated, pre-fill name from profile
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setReviewerName(profile.display_name || '')
          setReviewerEmail(profile.email || user.email || '')
        }
      }
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

    // Check if trying to review themselves
    if (isAuthenticated && currentUserId === creatorId) {
      setError('You cannot review yourself')
      return
    }

    // Validate anonymous fields
    if (!isAuthenticated) {
      if (!reviewerName.trim()) {
        setError('Please enter your name')
        return
      }
      if (!reviewerEmail.trim()) {
        setError('Please enter your email')
        return
      }
      if (!reviewerEmail.includes('@')) {
        setError('Please enter a valid email')
        return
      }
    }

    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      let result;
      
      if (isEditing && existingReview?.id) {
        // UPDATE existing review
        result = await supabase
          .from('creator_reviews')
          .update({
            rating: rating,
            comment: comment.trim() || null,
            edited_at: new Date().toISOString(),
            ...(isAuthenticated 
              ? { reviewer_id: currentUserId }
              : { 
                  reviewer_name: reviewerName.trim(),
                  reviewer_email: reviewerEmail.trim().toLowerCase(),
                  edit_token: editToken
                }
            )
          })
          .eq('id', existingReview.id)
          .eq(isAuthenticated ? 'reviewer_id' : 'edit_token', 
               isAuthenticated ? currentUserId : editToken)
          .select()
          .single()
      } else {
        // Check for existing review by email (for anonymous)
        if (!isAuthenticated) {
          const { data: existing } = await supabase
            .from('creator_reviews')
            .select('id, rating, comment, edit_token')
            .eq('creator_id', creatorId)
            .eq('reviewer_email', reviewerEmail.trim().toLowerCase())
            .maybeSingle()

          if (existing) {
            // Redirect to edit mode
            setError('You already reviewed this creator. You can edit your review below.')
            setSubmitting(false)
            if (onSuccess) {
              // Pass the existing review to parent for editing
              onSuccess()
            }
            return
          }
        }

        // INSERT new review
        const reviewData: any = {
          creator_id: creatorId,
          rating: rating,
          comment: comment.trim() || null,
          is_approved: true,
          created_at: new Date().toISOString(),
          reviewer_type: isAuthenticated ? 'authenticated' : 'anonymous'
        }

        if (isAuthenticated) {
          reviewData.reviewer_id = currentUserId
        } else {
          reviewData.reviewer_name = reviewerName.trim()
          reviewData.reviewer_email = reviewerEmail.trim().toLowerCase()
          reviewData.verification_token = crypto.randomUUID()
          reviewData.edit_token = editToken
          reviewData.is_verified = true // Set to false if you add email verification
        }

        result = await supabase
          .from('creator_reviews')
          .insert(reviewData)
          .select()
          .single()
      }

      if (result.error) {
        if (result.error.code === '23505') {
          setError('You have already reviewed this creator')
        } else if (result.error.code === '23514') {
          setError('You cannot review yourself')
        } else {
          setError(result.error.message || 'Failed to submit review')
        }
        throw result.error
      }

      // Update creator's rating
      await supabase.rpc('force_update_creator_rating', { p_creator_id: creatorId })

      // Notify components to refresh
      window.dispatchEvent(new CustomEvent('review-submitted', {
        detail: { creatorId }
      }))

      // Show success
      setSuccess(true)
      
      // Store edit token for future edits (anonymous users)
      if (!isAuthenticated && !isEditing) {
        localStorage.setItem(`review_edit_${creatorId}`, editToken)
      }

      // Reset form or close
      setTimeout(() => {
        if (onSuccess) onSuccess()
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
            {isEditing ? 'Review Updated!' : 'Review Published!'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isEditing 
              ? 'Your review has been updated successfully.'
              : 'Your review is now visible on the creator\'s profile.'
            }
          </p>
          
          {!isAuthenticated && !isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-sm font-medium text-blue-800 mb-1">
                ✉️ Save this to edit later:
              </p>
              <p className="text-xs text-blue-700 break-all font-mono bg-blue-100/50 p-2 rounded">
                {reviewerEmail}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Use this email to edit your review in the future.
              </p>
            </div>
          )}
          
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
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {isEditing ? 'Edit Your Review' : 'Leave a Review'}
        </h3>
        
        {/* Authentication Status */}
        {!isAuthenticated && !isEditing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Mail size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">Reviewing as guest?</span>
                <p className="text-xs mt-1">
                  Enter your email to post a review. You'll use this email to edit later.
                </p>
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

        {/* Anonymous User Fields - Only show if not authenticated */}
        {!isAuthenticated && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none text-gray-900 disabled:opacity-50"
                  placeholder="John Doe"
                  disabled={submitting || success || isEditing}
                  required={!isAuthenticated}
                />
                <UserIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none text-gray-900 disabled:opacity-50"
                  placeholder="you@example.com"
                  disabled={submitting || success || isEditing}
                  required={!isAuthenticated}
                />
                <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                We'll never share your email. Use this to edit your review later.
              </p>
            </div>
          </div>
        )}

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
            disabled={submitting || success}
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
            disabled={
              submitting || 
              rating === 0 || 
              (!isAuthenticated && (!reviewerName.trim() || !reviewerEmail.trim()))
            }
            className="flex items-center gap-2 px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isEditing ? 'Updating...' : 'Publishing...'}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{isEditing ? 'Update Review' : 'Publish Review'}</span>
              </>
            )}
          </button>
        </div>

        {/* Info Text */}
        <div className="mt-4 text-xs text-gray-500">
          {isAuthenticated 
            ? 'Your review will be linked to your profile.'
            : 'Your review will be published with your name and email. You can edit it later using the same email.'
          }
        </div>
      </div>
    </form>
  )
}