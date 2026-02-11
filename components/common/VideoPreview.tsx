// components/common/VideoPreview.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Play } from 'lucide-react'

interface VideoPreviewProps {
  src: string
  poster?: string
  className?: string
}

export default function VideoPreview({ src, poster, className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Try to autoplay when component mounts
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tryAutoplay = async () => {
      try {
        video.muted = true
        video.playsInline = true
        video.preload = 'auto'
        
        const playPromise = video.play()
        
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
        }
      } catch (error) {
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(tryAutoplay, 100)
  }, [])

  // Handle video errors
  const handleError = () => {
    setHasError(true)
  }

  // Try to play on user interaction
  const tryPlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (video.paused) {
        await video.play()
        setIsPlaying(true)
      }
    } catch (error) {
    }
  }

  // Handle video end
  const handleEnded = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => setIsPlaying(false))
    }
  }

  if (hasError) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center relative`}>
        <div className="text-gray-500">Video unavailable</div>
        {poster && (
          <img
            src={poster}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
      </div>
    )
  }

  return (
    <div 
      className={`${className} relative overflow-hidden bg-gray-100`}
      onClick={tryPlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        preload="auto"
        onError={handleError}
        onEnded={handleEnded}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Play button overlay if not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer">
          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Play size={20} className="ml-1" fill="black" />
          </div>
        </div>
      )}
      
      {/* Video indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span>VIDEO</span>
      </div>
    </div>
  )
}