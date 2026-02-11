// app/(client)/profile/page.tsx - UPDATED WITH CREATOR/CLIENT DETECTION
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { 
  User, Settings, Camera, Heart, Bookmark, 
  LayoutDashboard, Package, DollarSign, Upload,
  ArrowLeft, ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserType, getUserProfile } from '@/lib/utils/userType'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userType, setUserType] = useState<'creator' | 'client' | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    savedCount: 0,
    likedCount: 0,
    uploadsCount: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadUserStats()
    }
  }, [user])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      router.push('/login?redirect=/profile')
      return
    }
    
    const currentUser = session.user
    setUser(currentUser)
    
    // Load user profile and type
    const profile = await getUserProfile(currentUser.id)
    setUserProfile(profile)
    
    const type = await getUserType(currentUser.id)
    setUserType(type)
    
    setLoading(false)
  }

  async function loadUserStats() {
    if (!user) return
    
    try {
      // Get saved count
      const { count: savedCount } = await supabase
        .from('client_actions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .eq('action_type', 'save')

      // Get liked count
      const { count: likedCount } = await supabase
        .from('client_actions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .eq('action_type', 'like')

      // Get uploads count (if user is a creator)
      const { count: uploadsCount } = await supabase
        .from('portfolio_items')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)

      setStats({
        savedCount: savedCount || 0,
        likedCount: likedCount || 0,
        uploadsCount: uploadsCount || 0
      })
    } catch (error) {
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getProfileInitial = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name.charAt(0).toUpperCase()
    }
    return user?.email?.charAt(0).toUpperCase() || 'U'
  }

  const getProfileName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name
    }
    return user?.email?.split('@')[0] || 'User'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* DARK GREEN HEADER */}
      <header className="sticky top-0 z-50 border-b border-green-800 bg-green-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">
              {userType === 'creator' ? 'My Creator Profile' : 'My Profile'}
            </h1>
            <Link 
              href="/" 
              className="text-sm text-green-200 hover:text-white"
            >
              <ArrowLeft size={16} className="inline mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-2xl text-green-900 overflow-hidden">
                  {userProfile?.profile_image_url ? (
                    <img
                      src={userProfile.profile_image_url}
                      alt={getProfileName()}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getProfileInitial()
                  )}
                </div>
                {userType === 'creator' && (
                  <div className="absolute bottom-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    Creator
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getProfileName()}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-gray-500 text-sm">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Link 
                href="/saved"
                className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Bookmark className="mx-auto mb-2 text-green-700" size={24} />
                <div className="text-lg font-bold text-gray-900">{stats.savedCount}</div>
                <div className="text-sm text-gray-600">Saved</div>
              </Link>
              
              <Link 
                href="/liked"
                className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Heart className="mx-auto mb-2 text-red-600" size={24} />
                <div className="text-lg font-bold text-gray-900">{stats.likedCount}</div>
                <div className="text-sm text-gray-600">Liked</div>
              </Link>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <Camera className="mx-auto mb-2 text-gray-600" size={24} />
                <div className="text-lg font-bold text-gray-900">{stats.uploadsCount}</div>
                <div className="text-sm text-gray-600">Uploads</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <User className="mx-auto mb-2 text-gray-600" size={24} />
                <div className="text-lg font-bold text-gray-900">
                  {userType === 'creator' ? 'Creator' : 'Client'}
                </div>
                <div className="text-sm text-gray-600">Account Type</div>
              </div>
            </div>

            {/* Actions - Different for creators vs clients */}
            <div className="flex flex-wrap gap-3">
              {userType === 'creator' ? (
                <>
                  <Link 
                    href="/dashboard"
                    className="px-4 py-2 bg-green-900 text-white rounded-lg font-medium hover:bg-green-800 flex items-center gap-2"
                  >
                    <LayoutDashboard size={16} />
                    Creator Dashboard
                  </Link>
                  <Link 
                    href="/portfolio"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Camera size={16} />
                    Manage Portfolio
                  </Link>
                  <Link 
                    href="/dashboard/profile"
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Edit Profile
                  </Link>
                  <Link 
                    href={`/creator/${user.id}`}
                    className="px-4 py-2 border-2 border-green-800 text-green-800 rounded-lg font-medium hover:bg-green-50 flex items-center gap-2"
                    target="_blank"
                  >
                    <ExternalLink size={16} />
                    View Public Profile
                  </Link>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => router.push('/settings')}
                    className="px-4 py-2 bg-green-900 text-white rounded-lg font-medium hover:bg-green-800"
                  >
                    Edit Profile
                  </button>
                  <Link 
                    href="/become-creator"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Become a Creator
                  </Link>
                </>
              )}
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation - Different for creators vs clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/saved"
              className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <Bookmark className="inline-block mr-3 text-green-700" size={20} />
              <span className="font-medium text-gray-900">Saved Items</span>
              <p className="text-gray-600 text-sm mt-2">View all items you've saved</p>
            </Link>
            
            <Link 
              href="/liked"
              className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <Heart className="inline-block mr-3 text-red-600" size={20} />
              <span className="font-medium text-gray-900">Liked Items</span>
              <p className="text-gray-600 text-sm mt-2">View all items you've liked</p>
            </Link>
            
            {userType === 'creator' ? (
              <>
                <Link 
                  href="/upload"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Upload className="inline-block mr-3 text-blue-600" size={20} />
                  <span className="font-medium text-gray-900">Upload New Work</span>
                  <p className="text-gray-600 text-sm mt-2">Add new portfolio items</p>
                </Link>
                
                <Link 
                  href="/dashboard/profile?tab=rates"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <DollarSign className="inline-block mr-3 text-green-600" size={20} />
                  <span className="font-medium text-gray-900">Manage Pricing</span>
                  <p className="text-gray-600 text-sm mt-2">Update your service rates</p>
                </Link>
                
                <Link 
                  href="/dashboard/profile?tab=equipment"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Package className="inline-block mr-3 text-purple-600" size={20} />
                  <span className="font-medium text-gray-900">Equipment List</span>
                  <p className="text-gray-600 text-sm mt-2">Manage your gear inventory</p>
                </Link>
                
                <Link 
                  href="/dashboard"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <LayoutDashboard className="inline-block mr-3 text-gray-600" size={20} />
                  <span className="font-medium text-gray-900">Dashboard Analytics</span>
                  <p className="text-gray-600 text-sm mt-2">View performance insights</p>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/settings"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Settings className="inline-block mr-3 text-gray-600" size={20} />
                  <span className="font-medium text-gray-900">Account Settings</span>
                  <p className="text-gray-600 text-sm mt-2">Manage your account preferences</p>
                </Link>
                
                <Link 
                  href="/become-creator"
                  className="bg-white rounded-xl p-6 hover:bg-gray-50 transition-colors border border-gray-200 border-2 border-dashed border-blue-300"
                >
                  <Camera className="inline-block mr-3 text-blue-600" size={20} />
                  <span className="font-medium text-gray-900">Become a Creator</span>
                  <p className="text-gray-600 text-sm mt-2">Start sharing your work and earn money</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}