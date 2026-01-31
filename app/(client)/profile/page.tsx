// app/(client)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link' // ADD THIS
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
      console.error('Error loading user stats:', error)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.email}</h2>
                <p className="text-gray-400">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Link 
                href="/saved"
                className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-700 transition-colors"
              >
                <Bookmark className="mx-auto mb-2 text-blue-500" size={24} />
                <div className="text-lg font-bold">{stats.savedCount}</div>
                <div className="text-sm text-gray-400">Saved</div>
              </Link>
              
              <Link 
                href="/liked"
                className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-700 transition-colors"
              >
                <Heart className="mx-auto mb-2 text-red-500" size={24} />
                <div className="text-lg font-bold">{stats.likedCount}</div>
                <div className="text-sm text-gray-400">Liked</div>
              </Link>
              
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <Camera className="mx-auto mb-2 text-gray-500" size={24} />
                <div className="text-lg font-bold">{stats.uploadsCount}</div>
                <div className="text-sm text-gray-400">Uploads</div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <User className="mx-auto mb-2 text-gray-500" size={24} />
                <div className="text-lg font-bold">Client</div>
                <div className="text-sm text-gray-400">Account Type</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
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
              className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors"
            >
              <Bookmark className="inline-block mr-3 text-blue-500" size={20} />
              <span className="font-medium">Saved Items</span>
              <p className="text-gray-400 text-sm mt-2">View all items you've saved</p>
            </Link>
            
            <Link 
              href="/liked"
              className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-colors"
            >
              <Heart className="inline-block mr-3 text-red-500" size={20} />
              <span className="font-medium">Liked Items</span>
              <p className="text-gray-400 text-sm mt-2">View all items you've liked</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}