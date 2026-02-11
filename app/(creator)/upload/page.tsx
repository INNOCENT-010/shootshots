// app/(creator)/upload/page.tsx - WITH DROPDOWN & TYPEABLE CATEGORY
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  Upload, Image, Video, AlertCircle, Check, X, 
  Trash2, File, Loader2, Camera, Film, ArrowLeft, Tag, ChevronDown
} from 'lucide-react'

// Suggested categories for dropdown and autocomplete
const SUGGESTED_CATEGORIES = [
  'Portrait', 'Wedding', 'Fashion', 'Commercial', 'Brand Content',
  'Product', 'Event', 'Lifestyle', 'Editorial', 'Documentary',
  'Real Estate', 'Architecture', 'Food', 'Travel', 'Street', 'Sports',
  'Music Video', 'Short Film', 'Corporate Video', 'Interview',
  'YouTube Content', 'Vlog', 'Social Media Content', 'Mobile Photography',
  'Digital Art', 'Animation', 'Comic Art', 'Game Art', 'Graphic Design',
  'Nature', 'Wildlife', 'Urban', 'Abstract', 'Conceptual', 'Fine Art',
  'Advertising', 'Packaging', 'Logo Design', 'Typography', 'Illustration',
  'Motion Graphics', '3D Animation', 'Character Design', 'Storyboard',
  'Product Photography', 'Beauty', 'Fitness', 'Healthcare', 'Education',
  'Wedding Photography', 'Event Photography', 'Fashion Photography',
  'Portrait Photography', 'Product Photography', 'Real Estate Photography',
  'Food Photography', 'Travel Photography', 'Sports Photography',
  'Commercial Photography', 'Documentary Photography'
]

interface MediaFile {
  id: string
  file: File
  previewUrl: string
  type: 'image' | 'video'
  size: number
}

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
  })
  
  // Multiple media files
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])
  const [isTypingCategory, setIsTypingCategory] = useState(false)

  const categoryInputRef = useRef<HTMLInputElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Load user data
  useEffect(() => {
    if (user) {
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [user])

  // Filter categories based on input
  useEffect(() => {
    if (formData.category.trim() && isTypingCategory) {
      const searchTerm = formData.category.toLowerCase()
      const filtered = SUGGESTED_CATEGORIES.filter(category =>
        category.toLowerCase().includes(searchTerm)
      ).slice(0, 8) // Show only top 8 suggestions
      setCategorySuggestions(filtered)
      setShowCategoryDropdown(true)
    } else if (!isTypingCategory && formData.category.trim()) {
      // When not typing, show all categories
      setCategorySuggestions(SUGGESTED_CATEGORIES.slice(0, 15))
    } else {
      setCategorySuggestions(SUGGESTED_CATEGORIES.slice(0, 15))
    }
  }, [formData.category, isTypingCategory])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && 
          !categoryDropdownRef.current.contains(event.target as Node) &&
          categoryInputRef.current && 
          !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return

    // Process each file
    const newMediaFiles: MediaFile[] = files.map(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        setError(`File "${file.name}" is not an image or video`)
        return null
      }

      if (file.size > 50 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 50MB size limit`)
        return null
      }

      return {
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        type: isImage ? 'image' : 'video',
        size: file.size
      }
    }).filter(Boolean) as MediaFile[]

    // Add to existing files (limit to 20 per portfolio item)
    if (mediaFiles.length + newMediaFiles.length > 20) {
      setError('Maximum 20 files per portfolio item')
      return
    }

    setMediaFiles(prev => [...prev, ...newMediaFiles])
    setError('')
    e.target.value = ''
  }

  const removeMediaFile = (id: string) => {
    setMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const reorderMediaFile = (fromIndex: number, toIndex: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev]
      const [movedFile] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, movedFile)
      return newFiles
    })
  }

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, category: e.target.value }))
    setIsTypingCategory(true)
    if (e.target.value.trim()) {
      setShowCategoryDropdown(true)
    }
  }

  const selectCategory = (category: string) => {
    setFormData(prev => ({ ...prev, category }))
    setShowCategoryDropdown(false)
    setIsTypingCategory(false)
  }

  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown)
    if (!showCategoryDropdown) {
      setIsTypingCategory(false)
    }
  }

  const validateForm = () => {
    if (!user) {
      setError('You must be logged in to upload')
      return false
    }

    if (mediaFiles.length === 0) {
      setError('Please select at least one media file')
      return false
    }

    if (!formData.category.trim()) {
      setError('Please enter or select a category')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to upload')
      return
    }

    if (!validateForm()) {
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // Upload all media files to storage
      const uploadedMedia: Array<{
        media_url: string
        media_type: 'image' | 'video'
        display_order: number
      }> = []

      for (let i = 0; i < mediaFiles.length; i++) {
        const mediaFile = mediaFiles[i]
        
        const fileExt = mediaFile.file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${i}.${fileExt}`
        const filePath = `portfolio/${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('portfolio-media')
          .upload(filePath, mediaFile.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Failed to upload "${mediaFile.file.name}": ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('portfolio-media')
          .getPublicUrl(filePath)

        uploadedMedia.push({
          media_url: urlData.publicUrl,
          media_type: mediaFile.type,
          display_order: i
        })
      }

      // Create portfolio item in database
      const postData = {
        creator_id: user.id,
        title: formData.title || null,
        description: formData.description || null,
        category: formData.category.trim(),
        is_featured: false,
        media_count: uploadedMedia.length,
        cover_media_url: uploadedMedia[0]?.media_url || null
      }

      const { data: portfolioItem, error: itemError } = await supabase
        .from('portfolio_items')
        .insert(postData)
        .select()
        .single()

      if (itemError) {
        throw new Error(`Failed to create portfolio item: ${itemError.message}`)
      }

      // Create portfolio_media entries
      const mediaEntries = uploadedMedia.map(media => ({
        portfolio_item_id: portfolioItem.id,
        media_url: media.media_url,
        media_type: media.media_type,
        display_order: media.display_order
      }))

      const { error: mediaError } = await supabase
        .from('portfolio_media')
        .insert(mediaEntries)

      if (mediaError) {
        // Try to delete the portfolio item since media entries failed
        await supabase
          .from('portfolio_items')
          .delete()
          .eq('id', portfolioItem.id)
          
        throw new Error(`Failed to save media details: ${mediaError.message}`)
      }

      // Success
      setSuccess(`Portfolio item created successfully with ${mediaFiles.length} file${mediaFiles.length === 1 ? '' : 's'}!`)
      
      // Clear form
      setFormData({
        title: '',
        description: '',
        category: '',
      })
      setMediaFiles([])
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Add a redirect if user is not logged in
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-2xl font-semibold mb-4 text-gray-900">Authentication Required</div>
          <p className="text-gray-600 mb-6">You must be logged in to upload portfolio items.</p>
          <Link 
            href="/login" 
            className="inline-block px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          
          <h1 className="text-2xl font-semibold mb-2 text-gray-900">Upload New Portfolio Item</h1>
          <p className="text-gray-600">
            Showcase your work with images and videos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* File upload section */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900">
              Upload Media Files *
              <span className="text-gray-500 text-sm font-normal ml-2">
                Select multiple images/videos (max 20 per item)
              </span>
            </label>
            
            {/* File upload area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-white">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                multiple
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {mediaFiles.length === 0 ? (
                  <div className="space-y-4">
                    <div className="inline-flex p-4 bg-gray-100 rounded-full">
                      <Upload size={28} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-lg mb-1 text-gray-900">Drop files here or click to upload</div>
                      <div className="text-sm text-gray-500">
                        PNG, JPG, GIF, MP4 up to 50MB each
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        You can upload up to 20 files per portfolio item
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-500 mb-4">
                      Click to add more files ({mediaFiles.length}/20)
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Selected files preview */}
            {mediaFiles.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-gray-900">
                    Selected Files ({mediaFiles.length})
                    <span className="text-gray-500 text-sm ml-2">
                      First file will be used as cover image
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaFiles([])}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaFiles.map((file, index) => (
                    <div 
                      key={file.id} 
                      className="relative group bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square relative">
                        {file.type === 'image' ? (
                          <img
                            src={file.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                            <Film className="h-8 w-8 text-gray-400" />
                            <div className="absolute bottom-2 right-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded">
                              Video
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeMediaFile(file.id)}
                              className="p-1 bg-white hover:bg-gray-100 rounded text-gray-900"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="text-xs text-white bg-black/50 p-1 rounded">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                        
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                      </div>
                      
                      {mediaFiles.length > 1 && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => reorderMediaFile(index, index - 1)}
                              className="p-1 bg-black/70 hover:bg-black rounded text-xs text-white"
                            >
                              ↑
                            </button>
                          )}
                          {index < mediaFiles.length - 1 && (
                            <button
                              type="button"
                              onClick={() => reorderMediaFile(index, index + 1)}
                              className="p-1 bg-black/70 hover:bg-black rounded text-xs text-white"
                            >
                              ↓
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Camera className="h-4 w-4 text-gray-700" />
                      <span>
                        {mediaFiles.filter(f => f.type === 'image').length} image(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Film className="h-4 w-4 text-gray-700" />
                      <span>
                        {mediaFiles.filter(f => f.type === 'video').length} video(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <File className="h-4 w-4 text-gray-700" />
                      <span>
                        Total size: {formatFileSize(mediaFiles.reduce((sum, f) => sum + f.size, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:border-gray-800 focus:outline-none text-gray-900"
                  placeholder="e.g., Wedding Photography in Lagos"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:border-gray-800 focus:outline-none text-gray-900 h-32 resize-none"
                  placeholder="Describe this collection of work..."
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Category *
                </label>
                <div className="relative" ref={categoryDropdownRef}>
                  <div className="relative">
                    <input
                      ref={categoryInputRef}
                      type="text"
                      value={formData.category}
                      onChange={handleCategoryInputChange}
                      onFocus={() => setShowCategoryDropdown(true)}
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:border-gray-800 focus:outline-none text-gray-900 pr-10"
                      placeholder="Type or select a category"
                      required
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={toggleCategoryDropdown}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                  
                  {/* Category dropdown */}
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2">
                        {/* Search results header */}
                        {isTypingCategory && formData.category.trim() && (
                          <div className="px-3 py-2 border-b border-gray-200">
                            <div className="text-xs text-gray-500">
                              Suggestions for "{formData.category}"
                            </div>
                          </div>
                        )}
                        
                        {/* Popular categories header */}
                        {!isTypingCategory && (
                          <div className="px-3 py-2 border-b border-gray-200">
                            <div className="text-xs text-gray-500">
                              Popular Categories
                            </div>
                          </div>
                        )}
                        
                        {/* Categories list */}
                        <div className="max-h-48 overflow-y-auto">
                          {categorySuggestions.length > 0 ? (
                            categorySuggestions.map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => selectCategory(category)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 rounded flex items-center gap-2"
                              >
                                <Tag size={12} className="text-gray-400" />
                                {category}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                              No categories found. Type to create a new one.
                            </div>
                          )}
                        </div>
                        
                        {/* Custom category notice */}
                        <div className="px-3 py-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Can't find your category? Keep typing to create a new one.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Select from popular categories or type your own custom category
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium mb-3 text-gray-900">Upload Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Files to upload:</span>
                    <span className="font-medium">{mediaFiles.length} file(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Images:</span>
                    <span className="font-medium">{mediaFiles.filter(f => f.type === 'image').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Videos:</span>
                    <span className="font-medium">{mediaFiles.filter(f => f.type === 'video').length}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-medium text-gray-900">
                      <span>Ready to upload</span>
                      <span>{mediaFiles.length} file{mediaFiles.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Check size={16} />
                <span>{success}</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Redirecting to dashboard...
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading || mediaFiles.length === 0 || !formData.category.trim()}
              className="w-full p-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading {mediaFiles.length} file{mediaFiles.length === 1 ? '' : 's'}...
                </>
              ) : (
                `Upload Portfolio Item (${mediaFiles.length} file${mediaFiles.length === 1 ? '' : 's'})`
              )}
            </button>
            
            <div className="text-center mt-3">
              <Link 
                href="/dashboard" 
                className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                Cancel and return to dashboard
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}