// app/(client)/creator/[id]/page.tsx - MOBILE OPTIMIZED WITH MORE TAB
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  Mail, Phone, Instagram, MapPin, Camera, 
  Star, ArrowLeft, User, Calendar,
  Clock, DollarSign, Smartphone, Check,
  ChevronDown, ChevronUp, Share2, Grid,
  MessageCircle, BookOpen, ExternalLink,
  ThumbsUp, MessageSquare, Filter, Eye,
  Play, Heart, Bookmark, FileText, Download,
  Github, Linkedin, Twitter, Youtube, Facebook, Globe,
  Package, Layers, MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import VideoPreview from '@/components/common/VideoPreview'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewsDisplay from '@/components/reviews/ReviewsDisplay'

interface CreatorProfile {
  id: string
  display_name: string
  location: string
  email: string
  whatsapp_number: string
  instagram_url: string
  profile_image_url: string
  creator_type: string
  created_at: string
  about: string
  avg_rating: number
  total_reviews: number
  is_available: boolean
  rate_per_hour: number
  cv_url?: string
  cv_filename?: string
  cv_filetype?: string
  cv_filesize?: number
  cv_uploaded_at?: string
  cv_is_visible?: boolean
}

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  is_featured: boolean
  created_at: string
  view_count: number
  media_count: number
  cover_media_url: string
  portfolio_media: {
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

interface CreatorEquipment {
  id: string
  category: string
  name: string
  description?: string
}

interface CreatorRate {
  id: string
  service_type: string
  rate: number
  description?: string
  duration?: string
  display_order: number
}

interface CreatorSocialLink {
  id: string
  platform: string
  url: string
  display_order: number
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const creatorId = params.id as string
  
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [creatorEquipment, setCreatorEquipment] = useState<CreatorEquipment[]>([])
  const [creatorRates, setCreatorRates] = useState<CreatorRate[]>([])
  const [socialLinks, setSocialLinks] = useState<CreatorSocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullAbout, setShowFullAbout] = useState(false)
  const [expandedRates, setExpandedRates] = useState<number[]>([])
  const [showContactForm, setShowContactForm] = useState(false)
  const [message, setMessage] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'reviews' | 'more'>('portfolio')
  const [userHasReviewed, setUserHasReviewed] = useState(false)
  const [showCV, setShowCV] = useState(false)

  useEffect(() => {
    if (creatorId) {
      loadCreatorProfile()
    }
  }, [creatorId])

  async function loadCreatorProfile() {
    try {
      setLoading(true)
      
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single()

      if (creatorError) throw creatorError

      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          portfolio_media (
            media_url,
            media_type,
            display_order
          )
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(12)

      if (portfolioError) throw portfolioError

      setCreator(creatorData)
      setPortfolioItems(portfolioData || [])

      await loadCreatorData(creatorId)
      await loadSocialLinks(creatorId)
      await checkUserReview()

    } catch (error) {
      console.error('Error loading creator profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCreatorData(creatorId: string) {
    try {
      const { data: equipment } = await supabase
        .from('creator_equipment')
        .select('*')
        .eq('creator_id', creatorId)
        .order('category')
      
      if (equipment) setCreatorEquipment(equipment)

      const { data: rates } = await supabase
        .from('creator_rates')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('display_order')
      
      if (rates) {
        setCreatorRates(rates)
        setExpandedRates([0, 1, 2].slice(0, Math.min(3, rates.length)))
      }
    } catch (error) {
      console.error('Error loading creator data:', error)
    }
  }

  async function loadSocialLinks(creatorId: string) {
    try {
      const { data: links } = await supabase
        .from('creator_social_links')
        .select('*')
        .eq('creator_id', creatorId)
        .order('display_order')
      
      if (links) setSocialLinks(links)
    } catch (error) {
      console.error('Error loading social links:', error)
    }
  }

  async function checkUserReview() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserHasReviewed(false)
        return
      }

      const { data: review } = await supabase
        .from('creator_reviews')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('reviewer_id', user.id)
        .maybeSingle()

      setUserHasReviewed(!!review)
    } catch (error) {
      console.error('Error checking user review:', error)
      setUserHasReviewed(false)
    }
  }

  const handlePortfolioClick = (itemId: string) => {
    router.push(`/portfolio/${itemId}`)
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const starSize = {
      sm: 14,
      md: 18,
      lg: 24
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
        <span className={`ml-2 text-gray-700 font-medium ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}>
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  const getEquipmentIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'camera':
        return <Camera size={16} className="text-gray-600" />
      case 'mobile':
        return <Smartphone size={16} className="text-gray-600" />
      case 'lens':
        return <Camera size={16} className="text-gray-600" />
      case 'drone':
        return <Camera size={16} className="text-gray-600" />
      case 'gimbal':
        return <Camera size={16} className="text-gray-600" />
      case 'tripod':
        return <Camera size={16} className="text-gray-600" />
      case 'lighting':
        return <Camera size={16} className="text-gray-600" />
      case 'audio':
        return <Camera size={16} className="text-gray-600" />
      case 'software':
        return <Camera size={16} className="text-gray-600" />
      case 'accessory':
        return <Camera size={16} className="text-gray-600" />
      default:
        return <Camera size={16} className="text-gray-600" />
    }
  }

  const getSocialIcon = (platform: string) => {
    switch(platform) {
      case 'instagram':
        return <Instagram size={16} className="text-gray-700" />
      case 'twitter':
        return <Twitter size={16} className="text-gray-700" />
      case 'linkedin':
        return <Linkedin size={16} className="text-gray-700" />
      case 'github':
        return <Github size={16} className="text-gray-700" />
      case 'youtube':
        return <Youtube size={16} className="text-gray-700" />
      case 'facebook':
        return <Facebook size={16} className="text-gray-700" />
      case 'behance':
        return <span className="text-gray-700 text-sm font-medium">Be</span>
      case 'dribbble':
        return <span className="text-gray-700 text-sm font-medium">Dr</span>
      case 'vimeo':
        return <span className="text-gray-700 text-sm font-medium">V</span>
      case 'tiktok':
        return <span className="text-gray-700 text-sm">TikTok</span>
      case 'soundcloud':
        return <span className="text-gray-700 text-sm">SoundCloud</span>
      case 'spotify':
        return <span className="text-gray-700 text-sm">Spotify</span>
      case 'pinterest':
        return <span className="text-gray-700 text-sm">Pinterest</span>
      case 'website':
        return <Globe size={16} className="text-gray-700" />
      default:
        return <Globe size={16} className="text-gray-700" />
    }
  }

  const getFileIcon = (filetype: string) => {
    if (filetype?.includes('pdf')) {
      return <FileText size={20} className="text-red-600" />
    } else if (filetype?.includes('word') || filetype?.includes('doc')) {
      return <FileText size={20} className="text-blue-600" />
    } else if (filetype?.includes('image')) {
      return <Camera size={20} className="text-green-600" />
    } else {
      return <FileText size={20} className="text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const sendMessage = async () => {
    if (!creator || !message.trim()) return

    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: creator.id,
          recipient_id: creator.id,
          message: message.trim()
        })

      if (error) throw error

      alert('Message sent successfully')
      setMessage('')
      setShowContactForm(false)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-gray-600">Creator not found</div>
          <Link href="/" className="mt-4 inline-block text-gray-900 hover:underline font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const whatsappUrl = creator.whatsapp_number 
    ? `https://wa.me/${creator.whatsapp_number.replace(/\D/g, '')}`
    : null

  const memberSince = new Date(creator.created_at).getFullYear()
  const hasCV = creator.cv_url && creator.cv_is_visible === true

  const hasEquipment = creatorEquipment.length > 0
  const hasRates = creatorRates.length > 0
  const hasSocialLinks = socialLinks.length > 0

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-sm font-medium text-gray-700">MY PORTFOLIO</h1>
            </div>

            <button
              onClick={() => {
                const url = window.location.href
                navigator.clipboard.writeText(url)
                  .then(() => alert('Link copied to clipboard'))
                  .catch(() => alert('Failed to copy link'))
              }}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Creator Header - Mobile Optimized */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {creator.profile_image_url ? (
                      <img
                        src={creator.profile_image_url}
                        alt={creator.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={40} className="text-gray-600" />
                    )}
                  </div>
                  {creator.is_available && (
                    <div className="absolute bottom-2 right-2 bg-gray-900 text-white p-1.5 rounded-full">
                      <Check size={12} />
                    </div>
                  )}
                </div>

                <div className="text-center md:text-left">
                  <div className="mb-1">
                    {renderStars(creator.avg_rating, 'md')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {creator.total_reviews > 0 ? (
                      <>
                        {creator.total_reviews} review{creator.total_reviews !== 1 ? 's' : ''}
                      </>
                    ) : (
                      <span>No reviews yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{creator.display_name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {creator.location && (
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin size={14} />
                        <span>{creator.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-700">
                      <Camera size={14} />
                      <span className="capitalize text-sm">{creator.creator_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Calendar size={14} />
                      <span className="text-sm">Since {memberSince}</span>
                    </div>
                  </div>
                </div>

                {creator.about && (
                  <div className="mb-4">
                    <div className={`text-sm text-gray-700 ${!showFullAbout && 'line-clamp-2'}`}>
                      {creator.about}
                    </div>
                    {creator.about.length > 150 && (
                      <button
                        onClick={() => setShowFullAbout(!showFullAbout)}
                        className="mt-1 text-xs text-gray-900 hover:text-gray-700 font-medium flex items-center gap-1"
                      >
                        {showFullAbout ? (
                          <>
                            <ChevronUp size={12} />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={12} />
                            Read More
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                  >
                    <MessageCircle size={14} />
                    <span>Book</span>
                  </button>

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                    >
                      <Phone size={14} />
                      <span className="hidden xs:inline">WhatsApp</span>
                    </a>
                  )}

                  {hasCV && (
                    <button
                      onClick={() => setShowCV(!showCV)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                    >
                      <FileText size={14} />
                      <span className="hidden xs:inline">{showCV ? 'Hide CV' : 'CV'}</span>
                    </button>
                  )}
                </div>

                {hasCV && showCV && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(creator.cv_filetype || '')}
                        <div>
                          <div className="font-medium text-gray-900 text-sm">Curriculum Vitae</div>
                          <div className="text-xs text-gray-600">
                            {creator.cv_filesize ? formatFileSize(creator.cv_filesize) : ''}
                          </div>
                        </div>
                      </div>
                      <a
                        href={creator.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-xs"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Tabs - Portfolio, Reviews, More */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 md:flex-none px-3 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'portfolio'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Grid size={16} />
                  <span>Portfolio ({portfolioItems.length})</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 md:flex-none px-3 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Star size={16} />
                  <span>Reviews ({creator.total_reviews})</span>
                </div>
              </button>

              {(hasEquipment || hasRates || hasSocialLinks) && (
                <button
                  onClick={() => setActiveTab('more')}
                  className={`flex-1 md:hidden px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'more'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <MoreHorizontal size={16} />
                    <span>More</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Sidebar - Always visible on md+ */}
          <div className="hidden md:block">
            {activeTab === 'portfolio' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {/* Portfolio Grid - Desktop */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Portfolio Work</h2>
                      <div className="text-sm text-gray-600">
                        {portfolioItems.length} project{portfolioItems.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  
                    {portfolioItems.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="text-gray-600 mb-2">No portfolio work yet</div>
                        <p className="text-sm text-gray-500">
                          This creator hasn't uploaded any projects yet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {portfolioItems.map((item) => {
                          const coverMedia = item.portfolio_media?.find(m => m.display_order === 0) || 
                                           item.portfolio_media?.[0]
                          
                          return (
                            <div
                              key={item.id}
                              className="group cursor-pointer"
                              onClick={() => handlePortfolioClick(item.id)}
                            >
                              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                  {coverMedia?.media_type === 'image' ? (
                                    <img
                                      src={coverMedia.media_url || item.cover_media_url}
                                      alt={item.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <VideoPreview
                                      src={coverMedia?.media_url}
                                      poster={item.cover_media_url}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  )}
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                    <div className="p-4 w-full">
                                      <div className="text-white font-medium text-lg mb-1">{item.title || 'Untitled Project'}</div>
                                      <div className="text-gray-300 text-sm line-clamp-2">{item.description}</div>
                                    </div>
                                  </div>

                                  {coverMedia?.media_type === 'video' && (
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-full p-2">
                                      <Play size={14} className="text-white" />
                                    </div>
                                  )}

                                  {item.is_featured && (
                                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-300 flex items-center gap-1">
                                      <Star size={14} className="fill-yellow-500 text-yellow-600" />
                                      <span className="text-xs font-medium">Featured</span>
                                    </div>
                                  )}
                                </div>

                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                                      {item.title || 'Untitled Project'}
                                    </h3>
                                    <div className="text-xs text-gray-600">
                                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                                    {item.description}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {item.category}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {item.media_count} media{item.media_count !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Desktop Sidebar Content */}
                  {hasSocialLinks && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-4">Social Links</h3>
                      <div className="space-y-3">
                        {socialLinks.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {getSocialIcon(link.platform)}
                            <span className="text-sm text-gray-900 capitalize">{link.platform}</span>
                            <ExternalLink size={14} className="text-gray-500 ml-auto" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasEquipment && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Camera size={18} className="text-gray-700" />
                        <h3 className="font-semibold text-gray-900">Equipment & Gear</h3>
                      </div>
                      <div className="space-y-3">
                        {creatorEquipment.slice(0, 5).map((equip) => (
                          <div key={equip.id} className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getEquipmentIcon(equip.category)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{equip.name}</div>
                              {equip.description && (
                                <div className="text-xs text-gray-600 mt-0.5">{equip.description}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasRates && (
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign size={18} className="text-gray-700" />
                            <h3 className="font-semibold text-gray-900">Services & Pricing</h3>
                          </div>
                          <p className="text-sm text-gray-600">
                            {creatorRates.length} service{creatorRates.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {creatorRates.slice(0, 3).map((rate) => (
                          <div key={rate.id} className="border border-gray-200 rounded-lg">
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm capitalize">
                                  {rate.service_type.replace(/_/g, ' ')}
                                </div>
                                {rate.duration && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                    <Clock size={10} />
                                    <span>{rate.duration}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-900">
                                  ₦{rate.rate.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <ReviewsDisplay 
                    creatorId={creator.id}
                    showHeader={true}
                  />
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">About {creator.display_name}</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {creator.profile_image_url ? (
                          <img
                            src={creator.profile_image_url}
                            alt={creator.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{creator.display_name}</div>
                        <div className="text-sm text-gray-600 capitalize">{creator.creator_type.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Content - Conditional Rendering */}
          <div className="md:hidden">
            {activeTab === 'portfolio' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Portfolio Work</h2>
                  <div className="text-xs text-gray-600">
                    {portfolioItems.length} items
                  </div>
                </div>
              
                {portfolioItems.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-gray-600 text-sm">No portfolio work yet</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {portfolioItems.map((item) => {
                      const coverMedia = item.portfolio_media?.[0]
                      return (
                        <div
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => handlePortfolioClick(item.id)}
                        >
                          <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                            <div className="relative aspect-square">
                              {coverMedia?.media_type === 'image' ? (
                                <img
                                  src={coverMedia.media_url || item.cover_media_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <Play size={20} className="text-gray-600" />
                                </div>
                              )}
                              {item.media_count > 1 && (
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                  +{item.media_count - 1}
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <h3 className="font-medium text-gray-900 text-xs truncate">
                                {item.title || 'Untitled'}
                              </h3>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-600 truncate max-w-[70px]">
                                  {item.category}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Eye size={10} className="text-gray-500" />
                                  <span className="text-xs text-gray-600">{item.view_count}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <ReviewsDisplay 
                  creatorId={creator.id}
                  showHeader={true}
                />
              </div>
            )}

            {activeTab === 'more' && (
              <div className="space-y-4">
                {/* CV Section */}
                {hasCV && !showCV && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-700" />
                        <span className="font-medium text-gray-900">Curriculum Vitae</span>
                      </div>
                      <button
                        onClick={() => setShowCV(true)}
                        className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {hasSocialLinks && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-3">Social Links</h3>
                    <div className="space-y-2">
                      {socialLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          {getSocialIcon(link.platform)}
                          <span className="text-sm text-gray-900 capitalize">{link.platform}</span>
                          <ExternalLink size={12} className="text-gray-500 ml-auto" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment */}
                {hasEquipment && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Camera size={18} className="text-gray-700" />
                      <h3 className="font-medium text-gray-900">Equipment & Gear</h3>
                    </div>
                    <div className="space-y-2">
                      {creatorEquipment.slice(0, 3).map((equip) => (
                        <div key={equip.id} className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {getEquipmentIcon(equip.category)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{equip.name}</div>
                            {equip.description && (
                              <div className="text-xs text-gray-600">{equip.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services & Pricing */}
                {hasRates && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={18} className="text-gray-700" />
                      <h3 className="font-medium text-gray-900">Services & Pricing</h3>
                    </div>
                    <div className="space-y-2">
                      {creatorRates.slice(0, 3).map((rate) => (
                        <div key={rate.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <div className="font-medium text-gray-900 text-sm capitalize">
                              {rate.service_type.replace(/_/g, ' ')}
                            </div>
                            {rate.duration && (
                              <div className="text-xs text-gray-600">{rate.duration}</div>
                            )}
                          </div>
                          <div className="font-bold text-gray-900">
                            ₦{rate.rate.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Contact {creator.display_name}</h3>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                  rows={4}
                  placeholder={`Hi ${creator.display_name}, I'm interested in your services...`}
                />
              </div>
              
              <div className="text-xs text-gray-600">
                This message will be sent to the creator via Shootshots messaging system.
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}