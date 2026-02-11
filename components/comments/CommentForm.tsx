// components/comments/CommentForm.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, AlertCircle, X, Check, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { contentModerator } from '@/lib/moderation/contentFilter'

interface CommentFormProps {
  portfolioItemId: string
  parentCommentId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export default function CommentForm({
  portfolioItemId,
  parentCommentId,
  onSuccess,
  onCancel,
  placeholder = 'Add a comment...',
  autoFocus = false
}: CommentFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState<{ message: string; severity: 'low' | 'medium' | 'high' } | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])
  
  // Content moderation on type
  useEffect(() => {
    if (content.length > 3) {
      const preCheck = contentModerator.preCheck(content)
      if (!preCheck.isClean && preCheck.warning) {
        setWarning({
          message: preCheck.warning,
          severity: preCheck.severity || 'medium'
        })
        setShowWarning(true)
      } else {
        setWarning(null)
        setShowWarning(false)
      }
    } else {
      setWarning(null)
      setShowWarning(false)
    }
  }, [content])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('Please sign in to comment')
      return
    }
    
    if (content.trim().length < 1) {
      setError('Comment cannot be empty')
      return
    }
    
    if (content.length > 1000) {
      setError('Comment must be less than 1000 characters')
      return
    }
    
    setSubmitting(true)
    setError('')
    
    try {
      // Get user profile for caching
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, profile_image_url, creator_type')
        .eq('id', user.id)
        .single()
      
      // Submit comment (moderation happens in database trigger)
      const { data, error: submitError } = await supabase
        .from('portfolio_comments')
        .insert({
          portfolio_item_id: portfolioItemId,
          user_id: user.id,
          parent_comment_id: parentCommentId || null,
          content: content.trim(),
          user_display_name: profile?.display_name || 'User',
          user_profile_image_url: profile?.profile_image_url,
          user_creator_type: profile?.creator_type
        })
        .select()
        .single()
      
      if (submitError) throw submitError
      
      // Clear form
      setContent('')
      setWarning(null)
      setShowWarning(false)
      
      // Show success message based on moderation status
      if (data.moderation_status === 'approved') {
        if (onSuccess) onSuccess()
      } else if (data.moderation_status === 'pending') {
        alert('Your comment is under review and will be visible once approved.')
        if (onSuccess) onSuccess()
      } else {
        alert('Your comment was rejected due to inappropriate content.')
      }
      
    } catch (error: any) {
      setError(error.message || 'Failed to submit comment')
    } finally {
      setSubmitting(false)
    }
  }
  
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        {/* Warning Message */}
        {warning && showWarning && (
          <div className={`mb-3 p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium">{warning.message}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowWarning(false)}
                    className="text-xs px-2 py-1 rounded hover:opacity-80"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContent('')
                      setWarning(null)
                      setShowWarning(false)
                    }}
                    className="text-xs px-2 py-1 rounded hover:opacity-80"
                  >
                    Clear & Start Over
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="p-1 hover:opacity-70"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none resize-none text-gray-900 placeholder-gray-500"
          rows={3}
          maxLength={1000}
          disabled={submitting}
          autoFocus={autoFocus}
        />
        
        {/* Character Counter */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            {content.length}/1000 characters
          </div>
          
          {/* Content Safety Indicator */}
          {content.length > 0 && (
            <div className="flex items-center gap-1">
              <Shield size={12} className={warning ? 'text-red-500' : 'text-green-500'} />
              <span className={`text-xs ${warning ? 'text-red-600' : 'text-green-600'}`}>
                {warning ? 'Needs review' : 'Looks good'}
              </span>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-900 text-white text-sm rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            <span>{submitting ? 'Posting...' : parentCommentId ? 'Reply' : 'Comment'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}