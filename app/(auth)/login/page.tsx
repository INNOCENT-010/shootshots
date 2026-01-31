// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { migrateGuestLikesToUser } from '@/lib/utils/LikeSave'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCreatorLogin, setIsCreatorLogin] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // MIGRATE GUEST LIKES TO USER ACCOUNT
      if (data.user) {
        await migrateGuestLikesToUser(data.user.id)
      }
      
      // Redirect based on login type
      if (isCreatorLogin) {
        router.push('/dashboard')
      } else {
        router.push(redirect)
      }
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">Shootshots</h1>
        
        {/* Login Type Toggle */}
        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsCreatorLogin(false)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              !isCreatorLogin 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Client Login
          </button>
          <button
            type="button"
            onClick={() => setIsCreatorLogin(true)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              isCreatorLogin 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Creator Login
          </button>
        </div>

        {/* Login Indicator */}
        <div className={`mb-6 p-3 rounded-lg border text-center text-sm ${
          isCreatorLogin 
            ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
            : 'bg-gray-900 border-gray-700 text-gray-300'
        }`}>
          {isCreatorLogin 
            ? 'Logging in as a creator to access your portfolio dashboard' 
            : 'Logging in as a client to browse, like, and save items'
          }
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6 bg-gray-900 p-8 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-white focus:outline-none"
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-white focus:outline-none"
              required
              autoComplete="current-password"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isCreatorLogin
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {loading 
              ? (isCreatorLogin ? 'Logging in as Creator...' : 'Logging in...')
              : (isCreatorLogin ? 'Login as Creator' : 'Login')
            }
          </button>
          
          <div className="text-center space-y-3">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push(isCreatorLogin ? '/creator/signup' : '/signup')}
                className="text-white hover:underline"
              >
                Sign up {isCreatorLogin ? 'as Creator' : ''}
              </button>
            </p>
            
            <p className="text-gray-400 text-sm">
              {isCreatorLogin ? (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-white hover:underline"
                >
                  ← Back to Client Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/creator/login')}
                  className="text-white hover:underline"
                >
                  Creator Login →
                </button>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}