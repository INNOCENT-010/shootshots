'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { User, Mail, MapPin, Phone, Instagram, Save, Upload } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')

  const [formData, setFormData] = useState({
    display_name: '',
    location: '',
    email: '',
    whatsapp_number: '',
    instagram_url: '',
    profile_image_url: ''
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  async function loadProfile() {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (profileError) throw profileError

      if (profile) {
        setFormData({
          display_name: profile.display_name || '',
          location: profile.location || '',
          email: profile.email || user?.email || '',
          whatsapp_number: profile.whatsapp_number || '',
          instagram_url: profile.instagram_url || '',
          profile_image_url: profile.profile_image_url || ''
        })
        setProfileImageUrl(profile.profile_image_url || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image must be less than 5MB')
        return
      }

      setProfileImage(file)
      setProfileImageUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  const uploadProfileImage = async () => {
    if (!user || !profileImage) return null

    try {
      const fileExt = profileImage.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(filePath, profileImage, {
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('portfolio-media')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading profile image:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let profileImageUrl = formData.profile_image_url
      
      // Upload new profile image if selected
      if (profileImage) {
        const uploadedUrl = await uploadProfileImage()
        if (uploadedUrl) {
          profileImageUrl = uploadedUrl
        }
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          location: formData.location,
          email: formData.email,
          whatsapp_number: formData.whatsapp_number,
          instagram_url: formData.instagram_url,
          profile_image_url: profileImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
      setProfileImage(null) // Clear the file input
      
      // Refresh profile data
      loadProfile()
      
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Edit Profile</h1>
        <p className="text-gray-400">Update your contact information and profile picture</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile picture */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Profile Picture
          </label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 cursor-pointer">
                <div className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                  <Upload size={16} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-sm text-gray-400">
              <div>Click the icon to upload a new photo</div>
              <div>Recommended: Square image, max 5MB</div>
            </div>
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <User size={14} className="inline mr-2" />
            Display Name *
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => handleInputChange('display_name', e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            placeholder="Your name or brand"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Mail size={14} className="inline mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <MapPin size={14} className="inline mr-2" />
            Location
          </label>
          <select
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
          >
            <option value="">Select location</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            <option value="PH">Port Harcourt</option>
          </select>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Phone size={14} className="inline mr-2" />
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={formData.whatsapp_number}
            onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            placeholder="+234 800 000 0000"
          />
          <div className="mt-1 text-xs text-gray-500">
            Include country code. Clients will use this to contact you via WhatsApp.
          </div>
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Instagram size={14} className="inline mr-2" />
            Instagram Profile URL
          </label>
          <input
            type="url"
            value={formData.instagram_url}
            onChange={(e) => handleInputChange('instagram_url', e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-white focus:outline-none"
            placeholder="https://instagram.com/yourusername"
          />
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
            <div className="text-green-400">{success}</div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full p-4 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}