// components/comments/CommentsDisplay.tsx - CLEAN VERSION
'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Heart, ChevronDown, ChevronUp, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import CommentForm from './CommentForm'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  content: string
  moderation_status: string
  likes_count: number
  reply_count: number
  created_at: string
  user_display_name: string
  user_profile_image_url: string | null
  user_creator_type: string
  has_user_liked: boolean
  parent_comment_id: string | null
  user_id: string
  parent_comment_info?: {
    user_display_name: string
    user_id: string
  }
}

interface CommentsDisplayProps {
  portfolioItemId: string
  showHeader?: boolean
  maxInitialHeight?: number
  initialCommentsToShow?: number
}

export default function CommentsDisplay({ 
  portfolioItemId, 
  showHeader = true,
  maxInitialHeight = 400,
  initialCommentsToShow = 10
}: CommentsDisplayProps) {
  const { user } = useAuth()
  const [allComments, setAllComments] = useState<Comment[]>([])
  const [topLevelComments, setTopLevelComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  
  const commentsContainerRef = useRef<HTMLDivElement>(null)

  // Calculate total comments (including ALL replies)
  const totalCommentsCount = allComments.length

  // Load all comments in flat structure
  useEffect(() => {
    if (portfolioItemId) {
      loadComments()
    }
  }, [portfolioItemId, showAll])

  const loadComments = async () => {
    try {
      // Get ALL comments for this portfolio item
      const { data: allCommentsData, error } = await supabase
        .from('portfolio_comments')
        .select(`
          id,
          content,
          moderation_status,
          likes_count,
          reply_count,
          created_at,
          user_display_name,
          user_profile_image_url,
          user_creator_type,
          parent_comment_id,
          user_id
        `)
        .eq('portfolio_item_id', portfolioItemId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: true }) // Oldest first for proper reply ordering

      if (error) throw error

      // Create a map to get parent comment info for replies
      const commentMap = new Map<string, Comment>()
      const topLevel: Comment[] = []
      const all: Comment[] = []

      // First pass: store all comments in map
      allCommentsData?.forEach(comment => {
        const commentObj: Comment = {
          ...comment,
          has_user_liked: false
        }
        commentMap.set(comment.id, commentObj)
        all.push(commentObj)
      })

      // Second pass: add parent info to replies
      allCommentsData?.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id)
          if (parent) {
            const commentObj = commentMap.get(comment.id)
            if (commentObj) {
              commentObj.parent_comment_info = {
                user_display_name: parent.user_display_name,
                user_id: parent.user_id
              }
            }
          }
        } else {
          // This is a top-level comment
          topLevel.push(commentMap.get(comment.id)!)
        }
      })

      // Check likes for each comment
      if (user) {
        await Promise.all(
          all.map(async (comment) => {
            const { data: like } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single()
            
            comment.has_user_liked = !!like
          })
        )
      }

      // Sort top-level comments by engagement (likes + replies, newest first)
      topLevel.sort((a, b) => {
        const aEngagement = a.likes_count + (a.reply_count || 0)
        const bEngagement = b.likes_count + (b.reply_count || 0)
        return bEngagement - aEngagement || 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      // Sort all comments for display (recent first)
      all.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setAllComments(all)
      setTopLevelComments(topLevel)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // Handle liking a comment
  const handleLike = async (commentId: string) => {
    if (!user) {
      alert('Please sign in to like comments')
      return
    }

    try {
      const comment = allComments.find(c => c.id === commentId)
      if (!comment) return

      const hasLiked = comment.has_user_liked

      if (hasLiked) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        // Update state
        updateCommentLikes(commentId, -1, false)
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id
          })

        // Update state
        updateCommentLikes(commentId, 1, true)
      }
    } catch (error) {
    }
  }

  // Helper to update likes in state
  const updateCommentLikes = (commentId: string, delta: number, hasLiked: boolean) => {
    setAllComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? {
            ...comment,
            likes_count: Math.max(0, comment.likes_count + delta),
            has_user_liked: hasLiked
          }
        : comment
    ))
    
    setTopLevelComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? {
            ...comment,
            likes_count: Math.max(0, comment.likes_count + delta),
            has_user_liked: hasLiked
          }
        : comment
    ))
  }

  // Toggle replies visibility for a specific comment
  const toggleReplies = (commentId: string) => {
    const newSet = new Set(expandedComments)
    if (newSet.has(commentId)) {
      newSet.delete(commentId)
    } else {
      newSet.add(commentId)
    }
    setExpandedComments(newSet)
  }

  // Handle reply submission
  const handleReplySuccess = () => {
    setReplyingTo(null)
    loadComments()
  }

  // Get ALL replies for a parent comment (including replies to replies)
  const getAllRepliesForComment = (parentCommentId: string): Comment[] => {
    // Find all comments that have this comment in their ancestry
    const allReplies: Comment[] = []
    const queue = [parentCommentId]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const directReplies = allComments.filter(comment => 
        comment.parent_comment_id === currentId
      )
      
      allReplies.push(...directReplies)
      
      // Add their IDs to queue to get replies to replies
      directReplies.forEach(reply => {
        queue.push(reply.id)
      })
    }
    
    // Sort by creation time (oldest first)
    return allReplies.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  // Get display name for who a comment is replying to
  const getReplyTargetName = (comment: Comment): string => {
    if (!comment.parent_comment_id) return ''
    
    // Find the parent comment to get the display name
    const parentComment = allComments.find(c => c.id === comment.parent_comment_id)
    return parentComment?.user_display_name || ''
  }

  // Render a single comment
  const renderComment = (comment: Comment) => {
    const isReplyingToThis = replyingTo?.id === comment.id
    const isExpanded = expandedComments.has(comment.id)
    const allReplies = getAllRepliesForComment(comment.id)
    const replyTargetName = getReplyTargetName(comment)

    return (
      <div key={comment.id} className="mt-4">
        <div className="flex gap-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {comment.user_profile_image_url ? (
                <img
                  src={comment.user_profile_image_url}
                  alt={comment.user_display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={16} className="text-gray-600" />
              )}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Comment header with replied-to tag */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">
                {comment.user_display_name}
              </span>
              
              {/* Show "@username" tag for replies */}
              {replyTargetName && (
                <span className="text-xs text-gray-600 flex items-center">
                  <span className="mx-1">→</span>
                  <span className="text-green-700 font-medium">
                    @{replyTargetName}
                  </span>
                </span>
              )}
              
              {comment.user_creator_type && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded capitalize">
                  {comment.user_creator_type}
                </span>
              )}
              
              <span className="text-xs text-gray-500 ml-auto">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Comment text */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(comment.id)}
                  className={`flex items-center gap-1 text-xs ${
                    comment.has_user_liked 
                      ? 'text-red-600 font-semibold' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Heart size={14} className={comment.has_user_liked ? 'fill-red-600' : ''} />
                  <span>{comment.likes_count || 0}</span>
                </button>

                <button
                  onClick={() => setReplyingTo({id: comment.id, username: comment.user_display_name})}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-700"
                >
                  <MessageCircle size={14} />
                  <span>Reply</span>
                </button>

                {/* Replies toggle (only for parent comments with replies) */}
                {!comment.parent_comment_id && allReplies.length > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} />
                        <span>Hide {allReplies.length} repl{allReplies.length === 1 ? 'y' : 'ies'}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span>View {allReplies.length} repl{allReplies.length === 1 ? 'y' : 'ies'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Reply form inline */}
              {isReplyingToThis && (
                <div className="mt-3 border-t pt-3">
                  <div className="text-xs text-gray-600 mb-2">
                    Replying to <span className="font-semibold">@{comment.user_display_name}</span>
                  </div>
                  <CommentForm
                    portfolioItemId={portfolioItemId}
                    parentCommentId={comment.id}
                    placeholder={`Reply to ${comment.user_display_name}...`}
                    onSuccess={handleReplySuccess}
                    onCancel={() => setReplyingTo(null)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* ALL Replies List (shown directly underneath parent comment) */}
            {isExpanded && allReplies.length > 0 && (
              <div className="mt-3 space-y-3">
                {allReplies.map(reply => {
                  const replyTarget = getReplyTargetName(reply)
                  return (
                    <div key={reply.id} className="flex gap-3">
                      {/* Reply Avatar */}
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {reply.user_profile_image_url ? (
                            <img
                              src={reply.user_profile_image_url}
                              alt={reply.user_display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={16} className="text-gray-600" />
                          )}
                        </div>
                      </div>

                      {/* Reply Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {reply.user_display_name}
                          </span>
                          
                          {/* Show "@username" tag for the reply */}
                          {replyTarget && (
                            <span className="text-xs text-gray-600 flex items-center">
                              <span className="mx-1">→</span>
                              <span className="text-green-700 font-medium">
                                @{replyTarget}
                              </span>
                            </span>
                          )}
                          
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">
                            {reply.content}
                          </p>

                          {/* Reply Actions */}
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleLike(reply.id)}
                              className={`flex items-center gap-1 text-xs ${
                                reply.has_user_liked 
                                  ? 'text-red-600 font-semibold' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <Heart size={14} className={reply.has_user_liked ? 'fill-red-600' : ''} />
                              <span>{reply.likes_count || 0}</span>
                            </button>

                            <button
                              onClick={() => setReplyingTo({id: reply.id, username: reply.user_display_name})}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-700"
                            >
                              <MessageCircle size={14} />
                              <span>Reply</span>
                            </button>
                          </div>

                          {/* Nested reply form */}
                          {replyingTo?.id === reply.id && (
                            <div className="mt-3 border-t pt-3">
                              <div className="text-xs text-gray-600 mb-2">
                                Replying to <span className="font-semibold">@{reply.user_display_name}</span>
                              </div>
                              <CommentForm
                                portfolioItemId={portfolioItemId}
                                parentCommentId={reply.id}
                                placeholder={`Reply to ${reply.user_display_name}...`}
                                onSuccess={handleReplySuccess}
                                onCancel={() => setReplyingTo(null)}
                                autoFocus
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {/* Reply button at end of all replies */}
                <div className="ml-11">
                  <button
                    onClick={() => setReplyingTo({id: comment.id, username: comment.user_display_name})}
                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                  >
                    + Reply to thread
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Determine which comments to show (only top-level comments)
  const getCommentsToDisplay = () => {
    const topLevelToShow = showAll 
      ? topLevelComments 
      : topLevelComments.slice(0, initialCommentsToShow)
    
    return topLevelToShow
  }

  // Calculate if we need scrollable container
  const shouldBeScrollable = commentsContainerRef.current && 
    commentsContainerRef.current.scrollHeight > maxInitialHeight

  const commentsToDisplay = getCommentsToDisplay()
  const hasMoreComments = topLevelComments.length > initialCommentsToShow

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading comments...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header with TOTAL comments count */}
      {showHeader && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle size={20} />
                Comments ({totalCommentsCount})
              </h3>
              {topLevelComments.length > 0 && (
                <div className="text-gray-600 text-sm mt-1">
                  {topLevelComments.length} thread{topLevelComments.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment Input */}
      <div className="p-6 border-b border-gray-200">
        <CommentForm
          portfolioItemId={portfolioItemId}
          onSuccess={loadComments}
          placeholder="Add a comment..."
          autoFocus={false}
        />
      </div>

      {/* Scrollable Comments Container */}
      <div 
        ref={commentsContainerRef}
        className={`overflow-y-auto transition-all duration-300 ${!showAll ? `max-h-[${maxInitialHeight}px]` : ''}`}
        style={{ 
          maxHeight: !showAll ? `${maxInitialHeight}px` : 'none',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="p-6">
          {commentsToDisplay.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={48} className="text-gray-300 mx-auto mb-3" />
              <div className="text-gray-600 font-medium">No comments yet</div>
              <p className="text-gray-500 text-sm mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <>
              {commentsToDisplay.map(comment => renderComment(comment))}
              
              {/* Show More/Less with scrollable behavior */}
              {hasMoreComments && (
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-green-800 hover:text-green-700 font-medium flex items-center justify-center gap-1 mx-auto"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp size={16} />
                        Show fewer comments
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Show all {topLevelComments.length} comment threads
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scroll indicator (only when content exceeds max height) */}
      {shouldBeScrollable && !showAll && (
        <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none border-t border-gray-100" />
      )}
    </div>
  )
}