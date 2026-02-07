'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { User, Settings, Camera, Heart, Bookmark } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
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
    
    setUser(session.user)
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
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <Link 
              href="/" 
              className="text-sm text-green-200 hover:text-white"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-xl text-green-900">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.email}</h2>
                <p className="text-gray-600">Member since {new Date(user.created_at).toLocaleDateString()}</p>
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
                <div className="text-lg font-bold text-gray-900">Client</div>
                <div className="text-sm text-gray-600">Account Type</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-green-900 text-white rounded-lg font-medium hover:bg-green-800"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>
      </main>
    </div>
  )
}