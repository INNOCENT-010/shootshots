// app/(creator)/profile/page.tsx - COMPLETE WITH SOCIAL LINKS
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { 
  User, Mail, MapPin, Phone, Instagram, Save, Upload,
  Camera, DollarSign, Clock, Plus, Trash2,
  BookOpen, Smartphone, Package, Check,
  ChevronDown, ChevronUp, Eye, Edit,
  Star, Calendar, MessageCircle, Share2, ExternalLink,
  Grid, ArrowLeft, FileText, File, Download, Eye as EyeIcon, EyeOff,
  Globe, Github, Linkedin, Twitter, Youtube, Facebook
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EquipmentItem {
  id?: string
  category: string
  name: string
  description: string
}

interface RateItem {
  id?: string
  service_type: string
  rate: number
  description: string
  duration: string
  display_order: number
}

interface PortfolioItem {
  id: string
  title: string
  category: string
  cover_media_url: string
  created_at: string
}

interface CVInfo {
  url: string
  filename: string
  filetype: string
  filesize: number
  uploaded_at: string
  is_visible: boolean
}

interface CreatorSocialLink {
  id?: string
  platform: string
  url: string
  display_order: number
}

export default function CreatorProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedRates, setExpandedRates] = useState<number[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvInfo, setCvInfo] = useState<CVInfo | null>(null)
  const [isUploadingCV, setIsUploadingCV] = useState(false)
  const [socialLinks, setSocialLinks] = useState<CreatorSocialLink[]>([])
  
  const [formData, setFormData] = useState({
    display_name: '',
    
    location: '',
    email: '',
    slug:'',
    whatsapp_number: '',
    instagram_url: '',
    profile_image_url: '',
    about: '',
    creator_type: 'photographer',
    is_available: true,
    rate_per_hour: 0
  })

  const [equipment, setEquipment] = useState<EquipmentItem[]>([
    { category: 'camera', name: '', description: '' }
  ])

  const [rates, setRates] = useState<RateItem[]>([
    { 
      service_type: 'hourly_rate', 
      rate: 0, 
      description: 'Standard hourly rate', 
      duration: '1 hour',
      display_order: 0
    }
  ])

  const equipmentCategories = [
    { value: 'camera', label: 'Camera' },
    { value: 'mobile', label: 'Mobile Device' },
    { value: 'lens', label: 'Lens' },
    { value: 'lighting', label: 'Lighting' },
    { value: 'audio', label: 'Audio' },
    { value: 'software', label: 'Software' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'drone', label: 'Drone' },
    { value: 'gimbal', label: 'Gimbal' },
    { value: 'tripod', label: 'Tripod' }
  ]

  const serviceTypeSuggestions = [
    'Hourly Rate',
    'Portrait Session',
    'Wedding Photography',
    'Event Coverage',
    'Product Photography',
    'Real Estate Photography',
    'Fashion Photography',
    'Commercial Photography',
    'Video Production',
    'Photo Editing',
    'Video Editing',
    'Drone Photography',
    'Headshot Session',
    'Family Portrait',
    'Maternity Shoot',
    'Newborn Photography',
    'Corporate Event',
    'Music Video',
    'Documentary',
    'Social Media Content',
    'Logo Design',
    'Brand Identity',
    'UI/UX Design',
    'Web Design',
    '3D Modeling',
    'Animation',
    'Voice Over',
    'Sound Design',
    'Music Production'
  ]

  useEffect(() => {
    if (user) {
      loadProfile()
      loadPortfolioItems()
      loadCV()
      loadSocialLinks()
      setLoading(false)
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
          slug: profile.slug || '',
          location: profile.location || '',
          email: profile.email || user?.email || '',
          whatsapp_number: profile.whatsapp_number || '',
          instagram_url: profile.instagram_url || '',
          profile_image_url: profile.profile_image_url || '',
          about: profile.about || '',
          creator_type: profile.creator_type || 'photographer',
          is_available: profile.is_available !== false,
          rate_per_hour: profile.rate_per_hour || 0
        })
        setProfileImageUrl(profile.profile_image_url || '')

        const { data: equipmentData } = await supabase
          .from('creator_equipment')
          .select('*')
          .eq('creator_id', user!.id)
          .order('category')
        
        if (equipmentData && equipmentData.length > 0) {
          setEquipment(equipmentData)
        }

        const { data: ratesData } = await supabase
          .from('creator_rates')
          .select('*')
          .eq('creator_id', user!.id)
          .eq('is_active', true)
          .order('display_order')
        
        if (ratesData && ratesData.length > 0) {
          setRates(ratesData)
          setExpandedRates([0, 1, 2].slice(0, Math.min(3, ratesData.length)))
        }
      }
    } catch (error) {
    }
  }

  async function loadPortfolioItems() {
    try {
      const { data: items } = await supabase
        .from('portfolio_items')
        .select('id, title, category, cover_media_url, created_at')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(4)
      
      setPortfolioItems(items || [])
    } catch (error) {
    }
  }

  async function loadCV() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('cv_url, cv_filename, cv_filetype, cv_filesize, cv_uploaded_at, cv_is_visible')
        .eq('id', user!.id)
        .single()

      if (error) throw error

      if (profile?.cv_url) {
        setCvInfo({
          url: profile.cv_url,
          filename: profile.cv_filename || 'CV',
          filetype: profile.cv_filetype || 'pdf',
          filesize: profile.cv_filesize || 0,
          uploaded_at: profile.cv_uploaded_at || '',
          is_visible: profile.cv_is_visible || false
        })
      }
    } catch (error) {
    }
  }

  async function loadSocialLinks() {
    try {
      const { data: links } = await supabase
        .from('creator_social_links')
        .select('*')
        .eq('creator_id', user!.id)
        .order('display_order')

      if (links && links.length > 0) {
        setSocialLinks(links)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('instagram_url')
          .eq('id', user!.id)
          .single()

        if (profile?.instagram_url) {
          setSocialLinks([{
            platform: 'instagram',
            url: profile.instagram_url,
            display_order: 0
          }])
        }
      }
    } catch (error) {
    }
  }

  const toggleRateExpansion = (index: number) => {
    setExpandedRates(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const addEquipment = () => {
    setEquipment([...equipment, { category: 'camera', name: '', description: '' }])
  }

  const updateEquipment = (index: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...equipment]
    updated[index] = { ...updated[index], [field]: value }
    setEquipment(updated)
  }

  const removeEquipment = (index: number) => {
    if (equipment.length > 1) {
      setEquipment(equipment.filter((_, i) => i !== index))
    }
  }

  const addRate = () => {
    const newRate: RateItem = { 
      service_type: '', 
      rate: 0, 
      description: '', 
      duration: '',
      display_order: rates.length
    }
    setRates([...rates, newRate])
    setExpandedRates(prev => [...prev, rates.length])
  }

  const updateRate = (index: number, field: keyof RateItem, value: string | number) => {
    const updated = [...rates]
    updated[index] = { ...updated[index], [field]: value }
    setRates(updated)
  }

  const removeRate = (index: number) => {
    if (rates.length > 1) {
      setRates(rates.filter((_, i) => i !== index))
      setExpandedRates(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
    }
  }

  const moveRateUp = (index: number) => {
    if (index > 0) {
      const updated = [...rates]
      const temp = updated[index]
      updated[index] = updated[index - 1]
      updated[index - 1] = temp
      updated.forEach((rate, i) => {
        rate.display_order = i
      })
      setRates(updated)
    }
  }

  const moveRateDown = (index: number) => {
    if (index < rates.length - 1) {
      const updated = [...rates]
      const temp = updated[index]
      updated[index] = updated[index + 1]
      updated[index + 1] = temp
      updated.forEach((rate, i) => {
        rate.display_order = i
      })
      setRates(updated)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }

      setProfileImage(file)
      setProfileImageUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleCVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = [
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 
        'image/png', 
        'image/jpg'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF, DOCX, or image file')
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be less than 10MB')
        return
      }

      setCvFile(file)
      setError('')
    }
  }

  const uploadCV = async () => {
    if (!user || !cvFile) return false

    setIsUploadingCV(true)
    try {
      const fileExt = cvFile.name.split('.').pop()
      const fileName = `cv-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `cvs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(filePath, cvFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('portfolio-media')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cv_url: urlData.publicUrl,
          cv_filename: cvFile.name,
          cv_filetype: cvFile.type,
          cv_filesize: cvFile.size,
          cv_uploaded_at: new Date().toISOString(),
          cv_is_visible: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setCvInfo({
        url: urlData.publicUrl,
        filename: cvFile.name,
        filetype: cvFile.type,
        filesize: cvFile.size,
        uploaded_at: new Date().toISOString(),
        is_visible: true
      })

      setCvFile(null)
      setSuccess('CV uploaded successfully!')
      return true
    } catch (error: any) {
      setError(error.message || 'Failed to upload CV')
      return false
    } finally {
      setIsUploadingCV(false)
    }
  }

  const toggleCVVisibility = async () => {
    if (!user || !cvInfo) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          cv_is_visible: !cvInfo.is_visible,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setCvInfo(prev => prev ? { ...prev, is_visible: !prev.is_visible } : null)
      setSuccess(`CV is now ${!cvInfo.is_visible ? 'visible' : 'hidden'} on your profile`)
    } catch (error: any) {
      setError(error.message || 'Failed to update CV visibility')
    }
  }

  const deleteCV = async () => {
    if (!user || !cvInfo) return

    if (!confirm('Are you sure you want to delete your CV?')) return

    try {
      const filePath = cvInfo.url.split('/').pop()
      if (filePath) {
        await supabase.storage
          .from('portfolio-media')
          .remove([`cvs/${filePath}`])
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cv_url: null,
          cv_filename: null,
          cv_filetype: null,
          cv_filesize: null,
          cv_uploaded_at: null,
          cv_is_visible: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setCvInfo(null)
      setSuccess('CV deleted successfully!')
    } catch (error: any) {
      setError(error.message || 'Failed to delete CV')
    }
  }

  const uploadProfileImage = async () => {
    if (!user || !profileImage) return formData.profile_image_url

    try {
      const fileExt = profileImage.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio-media')
        .upload(filePath, profileImage, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('portfolio-media')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      return formData.profile_image_url
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let finalProfileImageUrl = formData.profile_image_url
      if (profileImage) {
        const uploadedUrl = await uploadProfileImage()
        if (uploadedUrl) {
          finalProfileImageUrl = uploadedUrl
        }
      }

      if (cvFile) {
        await uploadCV()
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          location: formData.location,
          email: formData.email,
          whatsapp_number: formData.whatsapp_number,
          instagram_url: formData.instagram_url,
          profile_image_url: finalProfileImageUrl,
          about: formData.about,
          creator_type: formData.creator_type,
          is_available: formData.is_available,
          rate_per_hour: formData.rate_per_hour,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await supabase
        .from('creator_equipment')
        .delete()
        .eq('creator_id', user.id)

      const validEquipment = equipment.filter(e => e.name.trim() !== '')
      if (validEquipment.length > 0) {
        const { error: equipmentError } = await supabase
          .from('creator_equipment')
          .insert(
            validEquipment.map(e => ({
              creator_id: user.id,
              category: e.category,
              name: e.name,
              description: e.description
            }))
          )

        if (equipmentError) throw equipmentError
      }

      await supabase
        .from('creator_rates')
        .update({ is_active: false })
        .eq('creator_id', user.id)

      const validRates = rates.filter(r => r.rate > 0 && r.service_type.trim() !== '')
      if (validRates.length > 0) {
        const { error: ratesError } = await supabase
          .from('creator_rates')
          .insert(
            validRates.map(r => ({
              creator_id: user.id,
              service_type: r.service_type.trim(),
              rate: r.rate,
              description: r.description.trim(),
              duration: r.duration.trim(),
              display_order: r.display_order,
              is_active: true
            }))
          )

        if (ratesError) throw ratesError
      }

      await supabase
        .from('creator_social_links')
        .delete()
        .eq('creator_id', user.id)

      const validLinks = socialLinks.filter(l => l.url.trim() !== '')
      if (validLinks.length > 0) {
        const { error: socialError } = await supabase
          .from('creator_social_links')
          .insert(
            validLinks.map((link, index) => ({
              creator_id: user.id,
              platform: link.platform,
              url: link.url.trim(),
              display_order: index
            }))
          )

        if (socialError) throw socialError
      }

      setSuccess('Profile updated successfully!')
      setProfileImage(null)
      
      loadProfile()
      loadSocialLinks()
      
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
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
        return <span className="text-gray-700 text-sm">♬</span>
      case 'soundcloud':
        return <span className="text-gray-700 text-sm">☁️</span>
      case 'spotify':
        return <span className="text-gray-700 text-sm">🎵</span>
      case 'pinterest':
        return <span className="text-gray-700 text-sm">📌</span>
      case 'website':
        return <Globe size={16} className="text-gray-700" />
      default:
        return <Globe size={16} className="text-gray-700" />
    }
  }

  const getFileIcon = (filetype: string) => {
    if (filetype.includes('pdf')) {
      return <FileText size={20} className="text-red-600" />
    } else if (filetype.includes('word') || filetype.includes('doc')) {
      return <FileText size={20} className="text-blue-600" />
    } else if (filetype.includes('image')) {
      return <Camera size={20} className="text-green-600" />
    } else {
      return <File size={20} className="text-gray-600" />
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

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'instagram', url: '', display_order: socialLinks.length }])
  }

  const updateSocialLink = (index: number, field: string, value: string) => {
    const updated = [...socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialLinks(updated)
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const previewProfileImage = profileImageUrl || formData.profile_image_url
  const memberSince = new Date().getFullYear()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
              <p className="text-gray-600">Manage your profile and preview how clients see it</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'edit'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit size={16} />
              Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye size={16} />
              Preview Profile
            </button>
          </div>
        </div>

        {activeTab === 'edit' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Basic Information</h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3 text-gray-900">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-300">
                            {previewProfileImage ? (
                              <img
                                src={previewProfileImage}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={40} className="text-gray-400" />
                            )}
                          </div>
                          <label className="absolute bottom-0 right-0 cursor-pointer">
                            <div className="p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
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
                        <div className="text-sm text-gray-600">
                          <div>Square image recommended</div>
                          <div>Max size: 5MB</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-gray-900">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => handleInputChange('display_name', e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                        placeholder="Your name or brand"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-gray-900">
                        <User size={14} className="inline mr-2 text-gray-700" />
                        Creator Type
                      </label>
                      <div className="relative">
                        <select
                          value={formData.creator_type}
                          onChange={(e) => handleInputChange('creator_type', e.target.value)}
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900 appearance-none"
                        >
                          <optgroup label=" DIGITAL VISUAL">
                            <option value="photographer">Photographer</option>
                            <option value="videographer">Videographer</option>
                            <option value="model">Model</option>
                            <option value="photo_video">Photo+Video (Hybrid)</option>
                            <option value="video_editor">Video Editor</option>
                          </optgroup>
                          <optgroup label="DIGITAL ARTS">
                            <option value="graphic_designer">Graphic Designer</option>
                            <option value="comic_artist">Comic Artist</option>
                            <option value="digital_artist">Digital Artist</option>
                            <option value="illustrator">Illustrator</option>
                            <option value="ui_ux_designer">UI/UX Designer</option>
                            <option value="web_designer">Web Designer</option>
                          </optgroup>
                          <optgroup label=" ANIMATION & 3D">
                            <option value="animator">Animator</option>
                            <option value="3d_artist">3D Artist</option>
                            <option value="motion_designer">Motion Designer</option>
                            <option value="vfx_artist">VFX Artist</option>
                            <option value="game_artist">Game Artist</option>
                          </optgroup>
                          <optgroup label=" SPECIALIZED">
                            <option value="sound_designer">Sound Designer</option>
                            <option value="music_producer">Music Producer</option>
                            <option value="voice_artist">Voice Artist</option>
                          </optgroup>
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown size={18} className="text-gray-500" />
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-gray-900">
                        <DollarSign size={14} className="inline mr-2" />
                        Standard Hourly Rate (₦)
                      </label>
                      <input
                        type="number"
                        value={formData.rate_per_hour}
                        onChange={(e) => handleInputChange('rate_per_hour', Number(e.target.value))}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                        placeholder="e.g., 15000"
                        min="0"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3 text-gray-900">
                        <FileText size={14} className="inline mr-2" />
                        Professional CV/Resume
                      </label>
                      <div className="space-y-4">
                        {cvInfo ? (
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getFileIcon(cvInfo.filetype)}
                                <div>
                                  <div className="font-medium text-gray-900">{cvInfo.filename}</div>
                                  <div className="text-xs text-gray-600">
                                    {formatFileSize(cvInfo.filesize)} • {formatDate(cvInfo.uploaded_at)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={toggleCVVisibility}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                                >
                                  {cvInfo.is_visible ? <EyeIcon size={14} /> : <EyeOff size={14} />}
                                  <span>{cvInfo.is_visible ? 'Visible' : 'Hidden'}</span>
                                </button>
                                <a
                                  href={cvInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:text-blue-800"
                                  title="View CV"
                                >
                                  <Eye size={18} />
                                </a>
                                <a
                                  href={cvInfo.url}
                                  download
                                  className="p-1.5 text-green-600 hover:text-green-800"
                                  title="Download CV"
                                >
                                  <Download size={18} />
                                </a>
                                <button
                                  type="button"
                                  onClick={deleteCV}
                                  className="p-1.5 text-red-600 hover:text-red-800"
                                  title="Delete CV"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                            <div className="text-gray-700 mb-2">No CV uploaded yet</div>
                            <p className="text-sm text-gray-600 mb-4">
                              Upload your CV/resume (PDF, DOCX, or images up to 10MB)
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                              <Upload size={18} />
                              <span>{cvInfo ? 'Replace CV' : 'Upload CV'}</span>
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={handleCVChange}
                              className="hidden"
                            />
                          </label>
                          {cvFile && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">{cvFile.name}</span>
                              <button
                                type="button"
                                onClick={() => setCvFile(null)}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                          {isUploadingCV && (
                            <div className="text-sm text-gray-600">Uploading...</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-900">
                        <BookOpen size={14} className="inline mr-2" />
                        About You
                      </label>
                      <textarea
                        value={formData.about}
                        onChange={(e) => handleInputChange('about', e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                        rows={4}
                        placeholder="Tell clients about your style, experience, and approach..."
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-gray-900">
                        Availability
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('is_available', !formData.is_available)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                            formData.is_available ? 'bg-gray-900' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            formData.is_available ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                        <span className="text-sm text-gray-700">
                          {formData.is_available ? 'Available for work' : 'Not available'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Contact Information</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-900">
                            <Mail size={14} className="inline mr-2 text-gray-700" />
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                            placeholder="you@example.com"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-900">
                            <MapPin size={14} className="inline mr-2 text-gray-700" />
                            Location
                          </label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                            placeholder="City, Country"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-900">
                            <Phone size={14} className="inline mr-2 text-gray-700" />
                            WhatsApp Number
                          </label>
                          <input
                            type="tel"
                            value={formData.whatsapp_number}
                            onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                            placeholder="+2348000000000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Social Links</h4>
                      
                      {socialLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <select
                                value={link.platform}
                                onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                                className="p-2 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900 text-sm w-32"
                              >
                                <option value="instagram">Instagram</option>
                                <option value="twitter">Twitter/X</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="github">GitHub</option>
                                <option value="behance">Behance</option>
                                <option value="dribbble">Dribbble</option>
                                <option value="youtube">YouTube</option>
                                <option value="vimeo">Vimeo</option>
                                <option value="tiktok">TikTok</option>
                                <option value="pinterest">Pinterest</option>
                                <option value="soundcloud">SoundCloud</option>
                                <option value="spotify">Spotify</option>
                                <option value="facebook">Facebook</option>
                                <option value="website">Personal Website</option>
                              </select>
                              <input
                                type="url"
                                value={link.url}
                                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900 text-sm"
                                placeholder="https://..."
                              />
                              <button
                                type="button"
                                onClick={() => removeSocialLink(index)}
                                className="p-2 text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addSocialLink}
                        className="flex items-center gap-2 px-4 py-2 text-gray-900 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Plus size={16} />
                        <span>Add Social Link</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Equipment & Gear</h3>
                    
                    {equipment.map((item, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Equipment #{index + 1}</h4>
                          {equipment.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEquipment(index)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-900">
                              Category
                            </label>
                            <select
                              value={item.category}
                              onChange={(e) => updateEquipment(index, 'category', e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                            >
                              <option value="">Select category</option>
                              {equipmentCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-900">
                              Equipment Name
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                              placeholder="e.g., Canon EOS R5, iPhone 15 Pro"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-900">
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateEquipment(index, 'description', e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                              placeholder="e.g., 45MP full-frame mirrorless camera"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addEquipment}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-900 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={18} />
                      <span className="font-medium">Add Equipment</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Services & Pricing</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Add your service packages and pricing
                    </p>

                    <div className="space-y-4">
                      {rates.map((rate, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleRateExpansion(index)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {expandedRates.includes(index) ? (
                                    <ChevronUp size={18} className="text-gray-600" />
                                  ) : (
                                    <ChevronDown size={18} className="text-gray-600" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {rate.service_type || 'New Service'}
                                  </div>
                                  {rate.rate > 0 && (
                                    <div className="text-sm text-gray-600">
                                      ₦{rate.rate.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveRateUp(index)}
                                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                )}
                                {index < rates.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveRateDown(index)}
                                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                )}
                                
                                {rates.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeRate(index)}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Remove service"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {expandedRates.includes(index) && (
                            <div className="p-4 bg-white">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900">
                                    Service Name
                                  </label>
                                  <input
                                    type="text"
                                    value={rate.service_type}
                                    onChange={(e) => updateRate(index, 'service_type', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                                    placeholder="e.g., Wedding Photography"
                                    list={`service-suggestions-${index}`}
                                  />
                                  <datalist id={`service-suggestions-${index}`}>
                                    {serviceTypeSuggestions.map((suggestion, idx) => (
                                      <option key={idx} value={suggestion} />
                                    ))}
                                  </datalist>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900">
                                    Price (₦)
                                  </label>
                                  <input
                                    type="number"
                                    value={rate.rate}
                                    onChange={(e) => updateRate(index, 'rate', Number(e.target.value))}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                                    placeholder="50000"
                                    min="0"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900">
                                    Duration (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={rate.duration}
                                    onChange={(e) => updateRate(index, 'duration', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                                    placeholder="e.g., 2 hours, Full day"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2 text-gray-900">
                                    Description (Optional)
                                  </label>
                                  <textarea
                                    value={rate.description}
                                    onChange={(e) => updateRate(index, 'description', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none text-gray-900"
                                    rows={2}
                                    placeholder="Describe what's included..."
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addRate}
                      className="mt-4 flex items-center gap-2 px-4 py-2.5 text-gray-900 border-2 border-gray-900 rounded-lg hover:bg-gray-50 transition-colors w-full justify-center"
                    >
                      <Plus size={18} />
                      <span className="font-medium">Add Service</span>
                    </button>
                  </div>
                </div>
              </div>

              {(error || success) && (
                <div className={`mt-6 p-4 rounded-lg ${error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className={`${error ? 'text-red-800' : 'text-green-800'}`}>
                    {error || success}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving || isUploadingCV}
                  className="w-full p-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'preview' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Profile Preview</h3>
                  <p className="text-sm text-gray-600">This is how clients will see your profile</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/${formData.slug}`)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-900 border border-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span className="text-sm font-medium">View Live Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Edit size={16} />
                    <span className="text-sm font-medium">Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center md:items-start gap-4">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                          {previewProfileImage ? (
                            <img
                              src={previewProfileImage}
                              alt={formData.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={48} className="text-gray-600" />
                          )}
                        </div>
                        {formData.is_available && (
                          <div className="absolute bottom-2 right-2 bg-gray-900 text-white p-1.5 rounded-full">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="mb-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                          {formData.display_name || 'Your Name'}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4">
                          {formData.location && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin size={16} />
                              <span>{formData.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-700">
                            <User size={16} />
                            <span className="capitalize">{formData.creator_type.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar size={16} />
                            <span>Member since {memberSince}</span>
                          </div>
                        </div>
                      </div>

                      

                      {formData.about && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={16} className="text-gray-700" />
                            <h3 className="font-semibold text-gray-900">About</h3>
                          </div>
                          <div className="text-gray-700 whitespace-pre-line">
                            {formData.about}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button className="flex items-center gap-2 px-2 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                          <MessageCircle size={16} />
                          <span>Contact for Booking</span>
                        </button>

                        {formData.whatsapp_number && (
                          <a
                            href={`https://wa.me/${formData.whatsapp_number.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                          >
                            <Phone size={16} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {socialLinks.filter(l => l.url.trim()).length > 0 && (
                          <div className="mt-6">
                            <h3 className="font-semibold text-gray-900 mb-3">Find Me On</h3>
                            <div className="flex flex-wrap gap-2">
                              {socialLinks.filter(l => l.url.trim()).map((link, index) => (
                                <a
                                  key={index}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  {getSocialIcon(link.platform)}
                                  <span className="text-sm text-gray-900 capitalize">{link.platform}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
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
                            Upload portfolio items to showcase your work
                          </p>
                          <Link
                            href="/upload"
                            className="inline-block mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                          >
                            Upload First Project
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {portfolioItems.map((item) => (
                            <div key={item.id} className="group cursor-pointer">
                              <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                  {item.cover_media_url ? (
                                    <img
                                      src={item.cover_media_url}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <Camera size={40} className="text-gray-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                                      {item.title || 'Untitled Project'}
                                    </h3>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {item.category}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {cvInfo && cvInfo.is_visible && (
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FileText size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Professional CV</h3>
                              <p className="text-sm text-gray-600">Available for clients</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
                            {getFileIcon(cvInfo.filetype)}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{cvInfo.filename}</div>
                              <div className="text-xs text-gray-600">
                                {formatFileSize(cvInfo.filesize)} • Uploaded {formatDate(cvInfo.uploaded_at)}
                              </div>
                            </div>
                            <a
                              href={cvInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:text-blue-800"
                              title="View CV"
                            >
                              <Eye size={18} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {equipment.filter(e => e.name.trim()).length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Package size={18} className="text-gray-700" />
                          <h3 className="font-semibold text-gray-900">Equipment & Gear</h3>
                        </div>
                        <div className="space-y-3">
                          {equipment.filter(e => e.name.trim()).slice(0, 5).map((equip, index) => (
                            <div key={index} className="flex items-start gap-3">
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
                    
                    {rates.filter(r => r.service_type.trim() && r.rate > 0).length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign size={18} className="text-gray-700" />
                              <h3 className="font-semibold text-gray-900">Services & Pricing</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                              {rates.filter(r => r.service_type.trim() && r.rate > 0).length} service{rates.filter(r => r.service_type.trim() && r.rate > 0).length !== 1 ? 's' : ''} available
                            </p>
                          </div>
                          {formData.rate_per_hour > 0 && (
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Starting from</div>
                              <div className="font-bold text-gray-900">₦{formData.rate_per_hour.toLocaleString()}/hour</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {rates
                            .filter(r => r.service_type.trim() && r.rate > 0)
                            .slice(0, 5)
                            .map((rate, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg">
                              <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 capitalize">
                                    {rate.service_type.replace(/_/g, ' ')}
                                  </div>
                                  {rate.duration && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                      <Clock size={12} />
                                      <span>{rate.duration}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-gray-900 text-lg">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}