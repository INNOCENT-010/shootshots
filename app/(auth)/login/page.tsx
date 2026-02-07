// app/(auth)/login/page.tsx - FIXED WITH SUSPENSE
'use client'

import { useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { migrateGuestLikesToUser } from '@/lib/utils/LikeSave'
import { Loader2 } from 'lucide-react'

function LoginContent() {
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
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center text-green-900">Shootshots</h1>
        
        {/* Login Type Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsCreatorLogin(false)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              !isCreatorLogin 
                ? 'bg-green-900 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Client Login
          </button>
          <button
            type="button"
            onClick={() => setIsCreatorLogin(true)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              isCreatorLogin 
                ? 'bg-green-900 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Creator Login
          </button>
        </div>

        {/* Login Indicator */}
        <div className={`mb-6 p-3 rounded-lg border text-center text-sm ${
          isCreatorLogin 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          {isCreatorLogin 
            ? 'Logging in as a creator to access your portfolio dashboard' 
            : 'Logging in as a client to browse, like, and save items'
          }
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
              required
              autoComplete="current-password"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isCreatorLogin
                ? 'bg-green-900 text-white hover:bg-green-800'
                : 'bg-green-900 text-white hover:bg-green-800'
            }`}
          >
            {loading 
              ? (isCreatorLogin ? 'Logging in as Creator...' : 'Logging in...')
              : (isCreatorLogin ? 'Login as Creator' : 'Login')
            }
          </button>
          
          <div className="text-center space-y-3">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push(isCreatorLogin ? '/signup' : '/signup')}
                className="text-green-800 hover:underline font-medium"
              >
                Sign up {isCreatorLogin ? 'as Creator' : ''}
              </button>
            </p>
            
            <p className="text-gray-600 text-sm">
              {isCreatorLogin ? (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-green-800 hover:underline font-medium"
                >
                  ← Back to Client Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-green-800 hover:underline font-medium"
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

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  )
}
