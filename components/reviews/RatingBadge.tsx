// components/reviews/RatingBadge.tsx
'use client'

import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface RatingBadgeProps {
  creatorId: string
  showNumber?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export default function RatingBadge({ creatorId, showNumber = true, size = 'md', className = '' }: RatingBadgeProps) {
  const [rating, setRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRating()
  }, [creatorId])

  const loadRating = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avg_rating, total_reviews')
        .eq('id', creatorId)
        .single()

      if (profile) {
        setRating(profile.avg_rating || 0)
        setReviewCount(profile.total_reviews || 0)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  if (loading || rating === 0) return null

  const starSize = size === 'sm' ? 12 : 14
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        <Star size={starSize} className="fill-yellow-500 text-yellow-500" />
        <span className={`ml-1 font-medium text-gray-900 ${textSize}`}>
          {rating.toFixed(1)}
        </span>
      </div>
      
      {showNumber && reviewCount > 0 && (
        <span className={`text-gray-600 ${textSize}`}>
          ({reviewCount})
        </span>
      )}
    </div>
  )
}