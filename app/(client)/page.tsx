'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

import HomeFeed from '@/components/feed/HomeFeed'
import FeedFilters from '@/components/feed/FeedFilters'

interface Filters {
  location: string
  creatorType: string
  mediaType: string
}

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<Filters>({
    location: 'All',
    creatorType: 'All', 
    mediaType: 'All'
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
      }
    )
    
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleFilterChange = (filters: Filters) => {
    setActiveFilters(filters)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header with navigation - DARK GREEN */}
      <header className="sticky top-0 z-50 border-b border-green-800 bg-green-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Brand */}
            <div>
              <h1 className="text-xl font-bold text-white">Shootshots</h1>
              <p className="text-green-200 text-sm">Discover photographers & videographers</p>
            </div>
            
            {/* Navigation links */}
            <div className="flex items-center gap-4">
              <Link 
                href="/browse" 
                className="text-sm text-green-200 hover:text-white transition-colors px-3 py-1 rounded hover:bg-green-800"
              >
                Browse Categories
              </Link>
              
              {/* ADD SAVED LINK FOR LOGGED-IN USERS */}
              {user && (
                <Link 
                  href="/saved" 
                  className="text-sm text-green-200 hover:text-white transition-colors px-3 py-1 rounded hover:bg-green-800"
                >
                  Saved Items
                </Link>
              )}
              
              <div className="hidden sm:block text-green-600">|</div>
              
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="text-sm text-green-300">Loading...</div>
                ) : user ? (
                  <>
                    {/* LOGGED-IN USER MENU */}
                    <div className="relative group">
                      <button className="flex items-center gap-2 text-sm text-green-200 hover:text-white transition-colors px-3 py-1 rounded hover:bg-green-800">
                        <div className="h-6 w-6 rounded-full bg-green-700 flex items-center justify-center">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        Account
                      </button>
                      
                      {/* Dropdown menu */}
                      <div className="absolute right-0 top-full mt-1 w-48 bg-green-800 border border-green-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-2">
                          <Link 
                            href="/profile" 
                            className="block px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                          >
                            My Profile
                          </Link>
                          <Link 
                            href="/saved" 
                            className="block px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                          >
                            Saved Items
                          </Link>
                          <Link 
                            href="/liked" 
                            className="block px-4 py-2 text-sm text-green-200 hover:bg-green-700 hover:text-white"
                          >
                            Liked Items
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-green-700 hover:text-red-200"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* LOGGED-OUT USER */}
                    <Link 
                      href="/login" 
                      className="text-sm text-green-200 hover:text-white transition-colors px-3 py-1 rounded hover:bg-green-800"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/signup" 
                      className="text-sm bg-white text-green-900 px-3 py-1 rounded font-medium hover:bg-green-50 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feed filters */}
      <FeedFilters onFilterChange={handleFilterChange} />

      {/* Main feed */}
      <HomeFeed filters={activeFilters} />
    </main>
  )
}
