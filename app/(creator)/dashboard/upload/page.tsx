'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Upload, Image, Video, AlertCircle, Check } from 'lucide-react'

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

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadCount, setUploadCount] = useState(0)
  const [canUpload, setCanUpload] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    mediaType: 'image' as 'image' | 'video',
    mediaFile: null as File | null,
    mediaUrl: ''
  })

  // Load upload limit on mount
  useState(() => {
    checkUploadLimit()
  })

  async function checkUploadLimit() {
    if (!user) return

    try {
      const { count } = await supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, portfolio_limit')
        .eq('id', user.id)
        .single()

      const currentCount = count || 0
      const maxLimit = profile?.portfolio_limit || 5
      
      setUploadCount(currentCount)
      setCanUpload(profile?.is_premium || currentCount < maxLimit)

      if (!profile?.is_premium && currentCount >= maxLimit) {
        setError(`Free tier limit reached (${maxLimit} items). Upgrade to premium for unlimited uploads.`)
      }
    } catch (error) {
      console.error('Error checking upload limit:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('File size must be less than 50MB')
        return
      }
      
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        setError('Please upload an image or video file')
        return
      }

      setFormData(prev => ({
        ...prev,
        mediaFile: file,
        mediaType: isImage ? 'image' : 'video',
        mediaUrl: URL.createObjectURL(file)
      }))
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.mediaFile || !formData.category) {
      setError('Please fill all required fields and select a file')
      return
    }

    if (!canUpload) {
      setError('Upload limit reached. Please upgrade to premium.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 1. Get user's creator type to validate category
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('creator_type')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const creatorType = profile?.creator_type as keyof typeof categoryOptions || 'photographer'
      const allowedCategories = categoryOptions[creatorType] || categoryOptions.photographer

      if (!allowedCategories.includes(formData.category)) {
        throw new Error(`Category "${formData.category}" is not allowed for ${creatorType}`)
      }

      // 2. Upload file to Supabase Storage
      const fileExt = formData.mediaFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `portfolio/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(filePath, formData.mediaFile)

      if (uploadError) throw uploadError

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from('portfolio-media')
        .getPublicUrl(filePath)

      // 4. Create portfolio item in database
      const { error: dbError } = await supabase
        .from('portfolio_items')
        .insert({
          creator_id: user.id,
          media_url: urlData.publicUrl,
          media_type: formData.mediaType,
          title: formData.title || null,
          description: formData.description || null,
          category: formData.category,
          is_featured: false // Default to false, can be paid feature later
        })

      if (dbError) throw dbError

      setSuccess('Portfolio item uploaded successfully!')
      setFormData({
        title: '',
        description: '',
        category: '',
        mediaType: 'image',
        mediaFile: null,
        mediaUrl: ''
      })
      
      // Refresh upload count
      checkUploadLimit()
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  // Get user's creator type for category options
  const [creatorType, setCreatorType] = useState<keyof typeof categoryOptions>('photographer')
  
  useState(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('creator_type')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.creator_type) {
            setCreatorType(data.creator_type as keyof typeof categoryOptions)
          }
        })
    }
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Upload Portfolio Item</h1>
        <p className="text-gray-400">Add new work to your portfolio</p>
        
        {/* Upload limit warning */}
        {!canUpload && (
          <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-yellow-400" />
              <div>
                <div className="font-medium">Upload Limit Reached</div>
                <div className="text-sm text-gray-300">
                  You've uploaded {uploadCount} items. Free tier allows 5 items.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Media {formData.mediaType === 'image' ? 'Image' : 'Video'} *
          </label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={!canUpload}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {formData.mediaUrl ? (
                <div className="space-y-4">
                  {formData.mediaType === 'image' ? (
                    <img
                      src={formData.mediaUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                  ) : (
                    <video
                      src={formData.mediaUrl}
                      className="max-h-64 mx-auto rounded-lg"
                      controls
                    />
                  )}
                  <div className="text-sm text-gray-400">
                    Click to change file
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex p-3 bg-gray-800 rounded-full">
                    <Upload size={24} />
                  </div>
                  <div>
                    <div className="font-medium">Click to upload</div>
                    <div className="text-sm text-gray-400">
                      PNG, JPG, GIF, MP4 up to 50MB
                    </div>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Title (Optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            placeholder="e.g., Wedding Photography in Lagos"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none h-32"
            placeholder="Describe your work..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            required
          >
            <option value="">Select a category</option>
            {categoryOptions[creatorType]?.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-gray-500">
            Available categories based on your creator type: {creatorType}
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <Check size={16} />
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !canUpload || !formData.mediaFile || !formData.category}
          className="w-full p-4 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : `Upload Item (${uploadCount}/5 used)`}
        </button>
      </form>
    </div>
  )
}