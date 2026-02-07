// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Camera, Video, Smartphone, Users, User } from 'lucide-react'

// Creator type options
const CREATOR_TYPES = [
  { 
    value: 'photographer', 
    label: 'Photographer', 
    description: 'Camera photography',
    icon: <Camera size={20} />
  },
  { 
    value: 'videographer', 
    label: 'Videographer', 
    description: 'Video production',
    icon: <Video size={20} />
  },
  { 
    value: 'mobile_photographer', 
    label: 'Mobile Photographer', 
    description: 'Smartphone photography',
    icon: <Smartphone size={20} />
  },
  { 
    value: 'mobile_videographer', 
    label: 'Mobile Videographer', 
    description: 'Smartphone videography',
    icon: <Video size={20} />
  },
  { 
    value: 'hybrid', 
    label: 'Hybrid Creator', 
    description: 'Both photo & video',
    icon: <Users size={20} />
  }
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [userType, setUserType] = useState<'client' | 'creator'>('creator')
  const [selectedCreatorType, setSelectedCreatorType] = useState('photographer')
  const [location, setLocation] = useState('Lagos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate inputs
      if (!displayName.trim()) {
        throw new Error('Display name is required')
      }
      if (!email.trim()) {
        throw new Error('Email is required')
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            user_type: userType,
            display_name: displayName.trim(),
            creator_type: userType === 'creator' ? selectedCreatorType : null,
            location: userType === 'creator' ? location : null
          }
        }
      })

      if (authError) throw authError
      
      if (authData.user) {
        // 2. Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            user_type: userType,
            creator_type: userType === 'creator' ? selectedCreatorType : null,
            display_name: displayName.trim(),
            email: email.trim(),
            location: userType === 'creator' ? location : null,
            portfolio_limit: userType === 'creator' ? 5 : 0,
          })

        if (profileError) throw profileError
        
        setSuccess('Account created successfully! You can now login.')
        
        // Auto login after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })

        if (!signInError) {
          setTimeout(() => {
            if (userType === 'creator') {
              router.push('/dashboard')
            } else {
              router.push('/')
            }
            router.refresh()
          }, 1500)
        } else {
          setTimeout(() => router.push('/login'), 2000)
        }
      }
    } catch (error: any) {
      setError(error.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-green-900">Join Shootshots</h1>
          <p className="text-gray-600">Create your account to start your creative journey</p>
        </div>
        
        <form onSubmit={handleSignup} className="space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          {/* User type selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900">I want to:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('client')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${userType === 'client' ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <User size={20} className="text-green-700" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Browse & Hire</div>
                    <div className="text-sm text-gray-600">Discover and contact creators</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setUserType('creator')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${userType === 'creator' ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <Camera size={20} className="text-green-700" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Showcase Work</div>
                    <div className="text-sm text-gray-600">Upload portfolio and get hired</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
                placeholder="Your creative name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
            <div className="mt-1 text-xs text-gray-600">
              Password must be at least 6 characters long
            </div>
          </div>

          {/* Creator-specific fields */}
          {userType === 'creator' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-900">
                  What type of creator are you? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CREATOR_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedCreatorType(type.value)}
                      className={`p-4 rounded-lg border text-left transition-all ${selectedCreatorType === type.value ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded">
                          {type.icon}
                        </div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Location *
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-300 focus:border-green-600 focus:outline-none text-gray-900"
                  required={userType === 'creator'}
                >
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="PH">Port Harcourt</option>
                </select>
              </div>

              {/* Free tier info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-medium mb-1 text-gray-900">Free Tier Includes:</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 5 portfolio item uploads</li>
                  <li>• Public profile with contact info</li>
                  <li>• Discoverable in client feeds</li>
                  <li>• Basic analytics</li>
                </ul>
              </div>
            </>
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <div className="font-medium">Error:</div>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <div className="font-medium">Success!</div>
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-green-900 text-white font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating account...
              </div>
            ) : (
              `Create ${userType === 'creator' ? 'Creator' : 'Client'} Account`
            )}
          </button>

          {/* Login link */}
          <div className="text-center text-gray-600 text-sm pt-4 border-t border-gray-200">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-green-800 font-medium hover:underline"
            >
              Sign in here
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
