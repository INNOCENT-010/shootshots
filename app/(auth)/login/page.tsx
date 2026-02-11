// app/(auth)/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { migrateGuestLikesToUser } from '@/lib/utils/LikeSave'
import { Camera, Loader2, ArrowRight, Cpu, Terminal, Shield, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fadeOut, setFadeOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user just signed up
    const signupSuccess = localStorage.getItem('signup_success')
    if (signupSuccess) {
      setSuccess('Account created successfully! Please login.')
      localStorage.removeItem('signup_success')
      setTimeout(() => setSuccess(''), 5000)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) throw error
      
      if (data.user) {
        await migrateGuestLikesToUser(data.user.id)
      }
      
      setSuccess('Login successful!')
      setFadeOut(true)
      
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single()
        
        if (profile?.user_type === 'creator') {
          router.push('/dashboard')
        } else {
          router.push('/')
        }
        router.refresh()
      }, 1500)
      
    } catch (error: any) {
      setError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (fadeOut) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Cpu className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400 text-sm">Accessing your digital portfolio...</p>
          <div className="mt-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-green-500 border-r-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center">
              <Cpu className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">ShootShots</h1>
              <p className="text-gray-400 text-xs">Digital Portfolio Platform</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Access your digital portfolio</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="text-green-400 text-sm">{success}</div>
              </div>
            )}
            
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm placeholder-gray-500"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Shield className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs text-gray-500 hover:text-green-400 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm placeholder-gray-500"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="text-red-400 text-sm">{error}</div>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full p-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Terminal className="h-5 w-5" />
                    Access Portfolio
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Divider */}
          <div className="px-8">
            <div className="border-t border-gray-800"></div>
          </div>
          
          {/* Footer */}
          <div className="p-8 pt-6 bg-gray-900/30">
            <div className="text-center space-y-4">
              <p className="text-gray-400 text-sm">
                Don't have a digital portfolio yet?
              </p>
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="w-full p-3 border-2 border-green-500/30 text-green-400 text-sm font-medium rounded-xl hover:bg-green-500/10 hover:border-green-500/50 transition-all"
              >
                Create Free Digital Portfolio
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                By signing in, you agree to our{' '}
                <button className="text-green-400 hover:text-green-300 hover:underline transition-colors">Terms</button> and{' '}
                <button className="text-green-400 hover:text-green-300 hover:underline transition-colors">Privacy Policy</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}