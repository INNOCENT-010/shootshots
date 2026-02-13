// app/(creator)/portfolio/edit/[id]/page.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import VideoPreview from '@/components/common/VideoPreview'
import { 
  ArrowLeft, Upload, Image as ImageIcon, X, Trash2, 
  Save, Loader2, AlertCircle, Camera, Film, File, Play
} from 'lucide-react'
import { toast } from 'sonner'

// Categories based on creator type
const categoryOptions = {
  photographer: [
    'Portrait', 'Wedding', 'Fashion', 'Commercial', 'Brand Content',
    'Product', 'Event', 'Lifestyle', 'Editorial', 'Documentary',
    'Real Estate', 'Architecture', 'Food', 'Travel', 'Street', 'Sports'
  ],
  videographer: [
    'Short Movie', 'Movie', 'Music Video', 'Corporate', 'Interview',
    'YouTube Content', 'Vlog', 'Live Coverage', 'Social Media Content'
  ],
  mobile_photographer: ['Mobile shot', 'Lifestyle', 'Street', 'Social Media Content'],
  mobile_videographer: ['Social Media Content', 'Vlog', 'Interview'],
  hybrid: [
    'Portrait', 'Wedding', 'Fashion', 'Commercial', 'Brand Content',
    'Product', 'Event', 'Lifestyle', 'Music Video', 'Corporate',
    'Real Estate', 'Travel', 'Social Media Content', 'Vlog'
  ]
}

interface PortfolioMedia {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  display_order: number
}

interface NewMediaFile {
  id: string
  file: File | null
  previewUrl: string
  type: 'image' | 'video'
  size: number
  fileName: string
}

interface UserLimits {
  max_posts: number
  max_media: number
  max_media_per_post: number
  posts_used: number
  media_used: number
  remaining_posts: number
  remaining_media: number
}

interface EditFormDraft {
  title: string
  description: string
  category: string
  is_featured: boolean
  existingMedia: PortfolioMedia[]
  newMediaPreviews: {
    id: string
    previewUrl: string
    type: 'image' | 'video'
    fileName: string
    fileSize: number
  }[]
  lastSaved: string
}

export default function EditPortfolioPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const itemId = params.id as string

  // ===== STORAGE KEYS =====
  const STORAGE_KEY = `portfolio_edit_draft_${user?.id}_${itemId}`

  // ===== FORM STATE =====
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [creatorType, setCreatorType] = useState<keyof typeof categoryOptions>('photographer')
  
  // ===== MEDIA STATE =====
  const [existingMedia, setExistingMedia] = useState<PortfolioMedia[]>([])
  const [newMediaFiles, setNewMediaFiles] = useState<NewMediaFile[]>([])
  
  // ===== USER LIMITS =====
  const [userLimits, setUserLimits] = useState<UserLimits>({
    max_posts: 3,
    max_media: 5,
    max_media_per_post: 5,
    posts_used: 0,
    media_used: 0,
    remaining_posts: 3,
    remaining_media: 5
  })
  
  // ===== UI STATES =====
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [savedDraft, setSavedDraft] = useState<EditFormDraft | null>(null)
  const [dataInitialized, setDataInitialized] = useState(false)

  // ===== CLEAR DRAFT =====
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY)
    setLastSaved(null)
  }

  // ===== LOAD DATA WITH LOCALSTORAGE CHECK =====
  useEffect(() => {
    if (!user || !itemId || dataInitialized) return

    const initializeData = async () => {
      try {
        const savedDraftData = localStorage.getItem(STORAGE_KEY)
        
        if (savedDraftData) {
          try {
            const parsed = JSON.parse(savedDraftData) as EditFormDraft
            setSavedDraft(parsed)
            setShowRestoreDialog(true)
            setDataInitialized(true)
            setLoading(false)
          } catch (e) {
            await loadExistingData()
          }
        } else {
          await loadExistingData()
        }
      } catch (error) {
        console.error('Error initializing:', error)
        setError('Failed to load data')
        setLoading(false)
      }
    }

    initializeData()
  }, [user, itemId, dataInitialized])

  // ===== RESTORE DRAFT - SIMPLIFIED =====
  const restoreDraft = () => {
    if (savedDraft) {
      setTitle(savedDraft.title)
      setDescription(savedDraft.description)
      setCategory(savedDraft.category)
      setIsFeatured(savedDraft.is_featured)
      setExistingMedia(savedDraft.existingMedia)
      
      // Create preview objects without File data
      // User will need to re-select files to upload
      const restoredFiles: NewMediaFile[] = savedDraft.newMediaPreviews.map(preview => ({
        id: preview.id,
        file: null, // No file data - user must reselect
        previewUrl: preview.previewUrl,
        type: preview.type,
        size: preview.fileSize,
        fileName: preview.fileName
      }))
      
      setNewMediaFiles(restoredFiles)
      
      if (savedDraft.lastSaved) {
        setLastSaved(new Date(savedDraft.lastSaved))
      }

      // Inform user they need to reselect files
      if (savedDraft.newMediaPreviews.length > 0) {
        toast.info('Please re-select the files you want to upload', {
          duration: 5000
        })
      }
    }
    setShowRestoreDialog(false)
    setSavedDraft(null)
  }

  // ===== DISCARD DRAFT =====
  const discardDraft = () => {
    clearDraft()
    loadExistingData()
    setShowRestoreDialog(false)
    setSavedDraft(null)
  }

  // ===== AUTO-SAVE TO LOCALSTORAGE =====
  useEffect(() => {
    if (!user || !itemId || loading || showRestoreDialog || !dataInitialized) return

    try {
      const draft: EditFormDraft = {
        title,
        description,
        category,
        is_featured: isFeatured,
        existingMedia,
        newMediaPreviews: newMediaFiles.map(file => ({
          id: file.id,
          previewUrl: file.previewUrl,
          type: file.type,
          fileName: file.fileName,
          fileSize: file.size
        })),
        lastSaved: new Date().toISOString()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save error:', error)
    }
  }, [title, description, category, isFeatured, existingMedia, newMediaFiles, user, itemId, loading, showRestoreDialog, dataInitialized])

  // ===== LOAD EXISTING DATA FROM SUPABASE =====
  async function loadExistingData() {
    try {
      setLoading(true)
      setError('')

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Load user profile and limits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('creator_type, current_plan_type, posts_used, media_used')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }

      if (profile?.creator_type) {
        setCreatorType(profile.creator_type as keyof typeof categoryOptions)
      }

      // Get plan limits
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('max_posts, max_media, max_media_per_post')
        .eq('plan_type', profile?.current_plan_type || 'free')
        .single()

      if (planError) {
        console.error('Plan error:', planError)
      }

      const maxPosts = plan?.max_posts || 3
      const maxMedia = plan?.max_media || 5
      const maxPerPost = plan?.max_media_per_post || 5
      const postsUsed = profile?.posts_used || 0
      const mediaUsed = profile?.media_used || 0

      setUserLimits({
        max_posts: maxPosts,
        max_media: maxMedia,
        max_media_per_post: maxPerPost,
        posts_used: postsUsed,
        media_used: mediaUsed,
        remaining_posts: Math.max(0, maxPosts - postsUsed),
        remaining_media: Math.max(0, maxMedia - mediaUsed)
      })

      // Load portfolio item
      const { data: item, error: itemError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('id', itemId)
        .eq('creator_id', user.id)
        .single()

      if (itemError) {
        console.error('Item error:', itemError)
        router.push('/portfolio')
        return
      }

      if (!item) {
        router.push('/portfolio')
        return
      }

      setTitle(item.title || '')
      setDescription(item.description || '')
      setCategory(item.category || '')
      setIsFeatured(item.is_featured || false)

      // Load existing media
      const { data: media, error: mediaError } = await supabase
        .from('portfolio_media')
        .select('*')
        .eq('portfolio_item_id', itemId)
        .order('display_order')

      if (mediaError) {
        console.error('Media error:', mediaError)
        throw mediaError
      }

      setExistingMedia(media || [])
      setDataInitialized(true)

    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load portfolio data')
      toast.error('Failed to load portfolio data')
    } finally {
      setLoading(false)
    }
  }

  // ===== HANDLE FILE SELECTION =====
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const totalAfterAdd = existingMedia.length + newMediaFiles.length + files.length
    if (totalAfterAdd > userLimits.max_media_per_post) {
      toast.error(`Maximum ${userLimits.max_media_per_post} media files per post allowed.`)
      return
    }

    const mediaAfterAdd = userLimits.media_used + files.length
    if (mediaAfterAdd > userLimits.max_media) {
      toast.error(`Adding ${files.length} files would exceed your media limit of ${userLimits.max_media}.`)
      return
    }

    const newFiles: NewMediaFile[] = files.map(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" is not an image or video`)
        return null
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 50MB size limit`)
        return null
      }

      return {
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        type: isImage ? 'image' : 'video',
        size: file.size,
        fileName: file.name
      }
    }).filter(Boolean) as NewMediaFile[]

    setNewMediaFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  // ===== REMOVE NEW MEDIA =====
  const removeNewMedia = (id: string) => {
    setNewMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // ===== REMOVE EXISTING MEDIA =====
  const removeExistingMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to remove this media file?')) return

    try {
      const { error } = await supabase
        .from('portfolio_media')
        .delete()
        .eq('id', mediaId)
        .eq('portfolio_item_id', itemId)

      if (error) throw error

      setExistingMedia(prev => prev.filter(media => media.id !== mediaId))
      
      await supabase
        .from('portfolio_items')
        .update({ 
          media_count: existingMedia.length - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      await supabase
        .from('profiles')
        .update({
          media_used: userLimits.media_used - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user!.id)

      setUserLimits(prev => ({
        ...prev,
        media_used: prev.media_used - 1,
        remaining_media: prev.remaining_media + 1
      }))

      toast.success('Media removed successfully')
    } catch (error) {
      console.error('Error removing media:', error)
      toast.error('Failed to remove media')
    }
  }

  // ===== REORDER EXISTING MEDIA =====
  const reorderMedia = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= existingMedia.length || 
        toIndex < 0 || toIndex >= existingMedia.length) return

    const newMedia = [...existingMedia]
    const [movedMedia] = newMedia.splice(fromIndex, 1)
    newMedia.splice(toIndex, 0, movedMedia)
    
    const updatedMedia = newMedia.map((media, index) => ({
      ...media,
      display_order: index
    }))

    setExistingMedia(updatedMedia)
  }

  // ===== UPLOAD NEW MEDIA =====
  const uploadNewMedia = async () => {
    if (newMediaFiles.length === 0) return []

    setUploadingMedia(true)
    const uploadedMedia: PortfolioMedia[] = []
    const filesToRemove: string[] = []

    try {
      for (let i = 0; i < newMediaFiles.length; i++) {
        const mediaFile = newMediaFiles[i]
        
        // Skip files that don't have actual file data (from restored drafts)
        if (!mediaFile.file) {
          toast.error(`File "${mediaFile.fileName}" needs to be re-selected`)
          filesToRemove.push(mediaFile.id)
          continue
        }

        const fileExt = mediaFile.file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${i}.${fileExt}`
        const filePath = `portfolio/${user!.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('portfolio-media')
          .upload(filePath, mediaFile.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('portfolio-media')
          .getPublicUrl(filePath)

        uploadedMedia.push({
          id: `temp_${i}`,
          media_url: urlData.publicUrl,
          media_type: mediaFile.type,
          display_order: existingMedia.length + i
        })
      }

      // Remove any files that couldn't be uploaded
      if (filesToRemove.length > 0) {
        setNewMediaFiles(prev => prev.filter(f => !filesToRemove.includes(f.id)))
      }

      if (uploadedMedia.length > 0) {
        toast.success(`${uploadedMedia.length} file(s) uploaded successfully`)
      }
      
      return uploadedMedia
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Failed to upload some files')
      throw error
    } finally {
      setUploadingMedia(false)
    }
  }

  // ===== SAVE CHANGES =====
  const handleSave = async () => {
    if (!category) {
      toast.error('Category is required')
      return
    }

    const allowedCategories = categoryOptions[creatorType] || categoryOptions.photographer
    if (!allowedCategories.includes(category)) {
      toast.error(`Category "${category}" is not allowed for ${creatorType}`)
      return
    }

    const totalMediaAfter = existingMedia.length + newMediaFiles.length
    if (totalMediaAfter > userLimits.max_media_per_post) {
      toast.error(`Maximum ${userLimits.max_media_per_post} media files per post allowed`)
      return
    }

    const mediaAfterAdd = userLimits.media_used + newMediaFiles.length
    if (mediaAfterAdd > userLimits.max_media) {
      toast.error(`Adding ${newMediaFiles.length} files would exceed your media limit of ${userLimits.max_media}`)
      return
    }

    setSaving(true)
    setError('')

    try {
      let uploadedNewMedia: PortfolioMedia[] = []
      if (newMediaFiles.length > 0) {
        uploadedNewMedia = await uploadNewMedia()
      }

      const { error: updateError } = await supabase
        .from('portfolio_items')
        .update({
          title: title.trim() || null,
          description: description.trim() || null,
          category,
          is_featured: isFeatured,
          media_count: existingMedia.length + uploadedNewMedia.length,
          updated_at: new Date().toISOString(),
          cover_media_url: existingMedia.length > 0 
            ? existingMedia[0].media_url 
            : uploadedNewMedia[0]?.media_url || null
        })
        .eq('id', itemId)
        .eq('creator_id', user!.id)

      if (updateError) throw updateError

      // Update display order for existing media
      for (let i = 0; i < existingMedia.length; i++) {
        const media = existingMedia[i]
        await supabase
          .from('portfolio_media')
          .update({ display_order: i })
          .eq('id', media.id)
          .eq('portfolio_item_id', itemId)
      }

      // Insert new media records
      if (uploadedNewMedia.length > 0) {
        const mediaToInsert = uploadedNewMedia.map(media => ({
          portfolio_item_id: itemId,
          media_url: media.media_url,
          media_type: media.media_type,
          display_order: media.display_order,
          created_at: new Date().toISOString()
        }))

        const { error: mediaError } = await supabase
          .from('portfolio_media')
          .insert(mediaToInsert)

        if (mediaError) throw mediaError

        await supabase
          .from('profiles')
          .update({
            media_used: userLimits.media_used + uploadedNewMedia.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', user!.id)
      }

      clearDraft()
      toast.success('Portfolio updated successfully!')
      
      setTimeout(() => {
        router.push('/portfolio')
      }, 1500)

    } catch (error: any) {
      console.error('Error saving changes:', error)
      setError(error.message || 'Failed to save changes. Please try again.')
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // ===== CANCEL EDITING =====
  const handleCancel = () => {
    if (window.confirm('Discard all changes?')) {
      clearDraft()
      newMediaFiles.forEach(file => {
        try {
          URL.revokeObjectURL(file.previewUrl)
        } catch (e) {}
      })
      router.push('/portfolio')
    }
  }

  // ===== FORMAT FILE SIZE =====
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ===== CLEANUP ON UNMOUNT =====
  useEffect(() => {
    return () => {
      newMediaFiles.forEach(file => {
        try {
          URL.revokeObjectURL(file.previewUrl)
        } catch (e) {}
      })
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600 mb-4" />
            <span className="text-gray-700">Loading portfolio data...</span>
          </div>
        </div>
      </div>
    )
  }

  const totalSelected = existingMedia.length + newMediaFiles.length
  const canSubmit = category && totalSelected > 0

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Restore Draft Dialog */}
        {showRestoreDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <File size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unsaved Changes Found
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  You have unsaved changes from your last editing session. Would you like to restore them?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={restoreDraft}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Restore Changes
                  </button>
                  <button
                    onClick={discardDraft}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={18} />
            <span>Back to Portfolio</span>
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Portfolio Post</h1>
              <p className="text-gray-600">Update your portfolio post details and media</p>
            </div>
            
            <div className="flex items-center gap-3">
              {lastSaved && !showRestoreDialog && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingMedia || !canSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving || uploadingMedia ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{uploadingMedia ? 'Uploading...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Wedding Photography in Lagos"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {title.length}/100 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this collection of work..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[120px]"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select a category</option>
                    {categoryOptions[creatorType]?.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    Categories for {creatorType}
                  </div>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Feature this post</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Current Media */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Current Media</h2>
              <div className="text-sm text-gray-600">
                {existingMedia.length} file(s)
              </div>
            </div>

            {existingMedia.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No media files in this post</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingMedia.map((media, index) => {
                  const isVideo = media.media_type === 'video' || 
                                 media.media_url?.includes('.mp4') || 
                                 media.media_url?.includes('.mov') || 
                                 media.media_url?.includes('webm');
                  
                  return (
                    <div key={media.id} className="relative group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-square relative">
                        {media.media_type === 'image' ? (
                          <img
                            src={media.media_url}
                            alt={`Media ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <VideoPreview
                            src={media.media_url}
                            poster={media.media_url}
                            className="h-full w-full object-cover"
                          />
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeExistingMedia(media.id)}
                              className="p-1 bg-red-600 hover:bg-red-700 rounded text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="text-xs text-white bg-black/50 p-1 rounded text-center">
                            {index === 0 ? 'Cover Image' : `Position ${index + 1}`}
                          </div>
                        </div>
                        
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                        
                        <div className="absolute top-2 right-2">
                          {media.media_type === 'image' ? (
                            <Camera className="h-4 w-4 text-blue-600 bg-white/80 p-0.5 rounded" />
                          ) : (
                            <Film className="h-4 w-4 text-green-600 bg-white/80 p-0.5 rounded" />
                          )}
                        </div>
                        
                        {isVideo && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                            <Play size={12} className="text-white" />
                          </div>
                        )}
                        
                        {existingMedia.length > 1 && (
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => reorderMedia(index, index - 1)}
                                className="p-1 bg-black/70 hover:bg-black rounded text-xs text-white"
                              >
                                ↑
                              </button>
                            )}
                            {index < existingMedia.length - 1 && (
                              <button
                                type="button"
                                onClick={() => reorderMedia(index, index + 1)}
                                className="p-1 bg-black/70 hover:bg-black rounded text-xs text-white"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Media */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Media</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-white">
                <input
                  type="file"
                  id="media-upload"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadingMedia || saving}
                />
                <label
                  htmlFor="media-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="h-12 w-12 text-gray-400 mb-3" />
                  <div className="font-medium text-lg mb-1 text-gray-900">
                    Click to upload or drag and drop
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    PNG, JPG, GIF, MP4 up to 50MB each
                  </div>
                  <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Select Files
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    You can add up to {userLimits.max_media_per_post - totalSelected} more files
                  </div>
                </label>
              </div>

              {/* New Media Previews */}
              {newMediaFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-gray-900">
                      New Files to Add ({newMediaFiles.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        newMediaFiles.forEach(file => {
                          try {
                            URL.revokeObjectURL(file.previewUrl)
                          } catch (e) {}
                        })
                        setNewMediaFiles([])
                      }}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Clear All New
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {newMediaFiles.map((file) => {
                      const isVideo = file.type === 'video';
                      const needsReselect = !file.file;
                      
                      return (
                        <div key={file.id} className="relative group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="aspect-square relative">
                            {file.type === 'image' ? (
                              <img
                                src={file.previewUrl}
                                alt={file.fileName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <VideoPreview
                                src={file.previewUrl}
                                poster={file.previewUrl}
                                className="h-full w-full object-cover"
                              />
                            )}
                            
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeNewMedia(file.id)}
                                  className="p-1 bg-red-600 hover:bg-red-700 rounded text-white"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="text-xs text-white bg-black/50 p-1 rounded text-center">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                            
                            <div className="absolute top-2 left-2">
                              {needsReselect ? (
                                <div className="bg-yellow-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Reselect
                                </div>
                              ) : (
                                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                  NEW
                                </div>
                              )}
                            </div>
                            
                            <div className="absolute top-2 right-2">
                              {file.type === 'image' ? (
                                <Camera className="h-4 w-4 text-blue-600 bg-white/80 p-0.5 rounded" />
                              ) : (
                                <Film className="h-4 w-4 text-green-600 bg-white/80 p-0.5 rounded" />
                              )}
                            </div>
                            
                            {isVideo && (
                              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                                <Play size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Camera className="h-4 w-4 text-blue-600" />
                        <span>
                          {newMediaFiles.filter(f => f.type === 'image').length} new image(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Film className="h-4 w-4 text-green-600" />
                        <span>
                          {newMediaFiles.filter(f => f.type === 'video').length} new video(s)
                        </span>
                      </div>
                      {newMediaFiles.some(f => !f.file) && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle size={14} />
                          <span>Some files need to be re-selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Summary */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h4 className="font-medium mb-4 text-gray-900">Edit Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Existing files to keep:</span>
                <span className="font-medium">{existingMedia.length} file(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">New files to add:</span>
                <span className="font-medium">{newMediaFiles.length} file(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total files after edit:</span>
                <span className="font-medium">{totalSelected} file(s)</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between font-medium text-gray-900">
                  <span>Post totals after edit:</span>
                  <span className="text-right">
                    <div>{totalSelected} files in post</div>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploadingMedia || !canSubmit}
              className="w-full p-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving || uploadingMedia ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {uploadingMedia ? `Uploading...` : 'Saving changes...'}
                </>
              ) : (
                `Save Changes (${totalSelected} file${totalSelected === 1 ? '' : 's'})`
              )}
            </button>
            
            <div className="text-center mt-3">
              <button
                onClick={handleCancel}
                className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                Cancel and return to portfolio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}