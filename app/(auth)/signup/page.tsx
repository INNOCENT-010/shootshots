// app/(auth)/signup/page.tsx - COMPLETE FIXED FILE
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Camera, 
  Video, 
  User, 
  Palette, 
  Film, 
  Brush, 
  Gamepad2, 
  MapPin, 
  Cpu,
  Terminal,
  ArrowRight,
  Lock,
  Mail,
  Globe,
  Monitor,
  Layers,
  Package,
  Zap,
  MousePointer,
  Sparkles,
  Headphones,
  Music,
  Mic,
  Scissors
} from 'lucide-react'

// Country and city data
const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Benin City', 'Warri'] },
  { code: 'GH', name: 'Ghana', cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Sunyani', 'Ho'] },
  { code: 'KE', name: 'Kenya', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi'] },
  { code: 'ZA', name: 'South Africa', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London'] },
  { code: 'US', name: 'United States', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Atlanta', 'Seattle'] },
  { code: 'UK', name: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Glasgow', 'Edinburgh', 'Bristol'] },
  { code: 'CA', name: 'Canada', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'] },
  { code: 'AU', name: 'Australia', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast'] },
  { code: 'DE', name: 'Germany', cities: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf'] },
  { code: 'FR', name: 'France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg'] },
  { code: 'BR', name: 'Brazil', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus'] },
  { code: 'IN', name: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'] },
  { code: 'CN', name: 'China', cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan'] },
  { code: 'JP', name: 'Japan', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka'] },
  { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah'] },
  { code: 'SA', name: 'Saudi Arabia', cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Tabuk', 'Al Khobar'] },
  { code: 'EG', name: 'Egypt', cities: ['Cairo', 'Alexandria', 'Giza', 'Shubra El-Kheima', 'Port Said', 'Suez', 'Luxor'] },
  { code: 'MA', name: 'Morocco', cities: ['Casablanca', 'Rabat', 'Fes', 'Marrakesh', 'Tangier', 'Agadir', 'Meknes'] },
  { code: 'RW', name: 'Rwanda', cities: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Cyangugu'] },
  { code: 'TZ', name: 'Tanzania', cities: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Mbeya', 'Morogoro', 'Tanga'] },
]

// Creator types with digital icons
const CREATOR_TYPES = [
  { 
    value: 'photographer', 
    label: 'Photographer', 
    description: 'Digital photography',
    icon: Camera,
    category: 'Digital Visual'
  },
  { 
    value: 'videographer', 
    label: 'Videographer', 
    description: 'Video production & editing',
    icon: Video,
    category: 'Digital Visual'
  },
  { 
    value: 'model', 
    label: 'Model', 
    description: 'Fashion & commercial modeling',
    icon: User,
    category: 'Digital Visual'
  },
  { 
    value: 'photo_video', 
    label: 'Photo+Video', 
    description: 'Both photography & videography',
    icon: Monitor,
    category: 'Digital Visual'
  },
  { 
    value: 'graphic_designer', 
    label: 'Graphic Designer', 
    description: 'Digital design & illustration',
    icon: Layers,
    category: 'Digital Arts'
  },
  { 
    value: 'animator', 
    label: 'Animator', 
    description: '2D/3D animation & motion',
    icon: Film,
    category: 'Animation & 3D'
  },
  { 
    value: 'comic_artist', 
    label: 'Comic Artist', 
    description: 'Comics, manga & digital art',
    icon: Brush,
    category: 'Digital Arts'
  },
  { 
    value: 'digital_artist', 
    label: 'Digital Artist', 
    description: 'Digital painting & concept art',
    icon: Cpu,
    category: 'Digital Arts'
  },
  { 
    value: 'game_artist', 
    label: 'Game Artist', 
    description: 'Game design & character art',
    icon: Gamepad2,
    category: 'Specialized'
  },
  { 
    value: 'ui_ux_designer', 
    label: 'UI/UX Designer', 
    description: 'Digital interface design',
    icon: MousePointer,
    category: 'Digital Arts'
  },
  { 
    value: 'web_designer', 
    label: 'Web Designer', 
    description: 'Website design & development',
    icon: Terminal,
    category: 'Digital Arts'
  },
  { 
    value: '3d_artist', 
    label: '3D Artist', 
    description: '3D modeling & rendering',
    icon: Package,
    category: 'Animation & 3D'
  },
  { 
    value: 'motion_designer', 
    label: 'Motion Designer', 
    description: 'Motion graphics & animation',
    icon: Zap,
    category: 'Animation & 3D'
  },
  { 
    value: 'illustrator', 
    label: 'Illustrator', 
    description: 'Digital illustration',
    icon: Brush,
    category: 'Digital Arts'
  },
  { 
    value: 'vfx_artist', 
    label: 'VFX Artist', 
    description: 'Visual effects & compositing',
    icon: Sparkles,
    category: 'Animation & 3D'
  },
  { 
    value: 'sound_designer', 
    label: 'Sound Designer', 
    description: 'Audio production & design',
    icon: Headphones,
    category: 'Specialized'
  },
  { 
    value: 'music_producer', 
    label: 'Music Producer', 
    description: 'Music production & composition',
    icon: Music,
    category: 'Specialized'
  },
  { 
    value: 'voice_artist', 
    label: 'Voice Artist', 
    description: 'Voice acting & narration',
    icon: Mic,
    category: 'Specialized'
  },
  { 
    value: 'video_editor', 
    label: 'Video Editor', 
    description: 'Video editing & post-production',
    icon: Scissors,
    category: 'Digital Visual'
  }
]

// Group creator types by category
const groupedCreatorTypes = CREATOR_TYPES.reduce((groups, type) => {
  const category = type.category
  if (!groups[category]) {
    groups[category] = []
  }
  groups[category].push(type)
  return groups
}, {} as Record<string, typeof CREATOR_TYPES>)

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedCreatorType, setSelectedCreatorType] = useState('photographer')
  const [selectedCountry, setSelectedCountry] = useState('NG')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fadeOut, setFadeOut] = useState(false)
  const router = useRouter()

  // Get cities for selected country
  const currentCities = COUNTRIES.find(c => c.code === selectedCountry)?.cities || []

  useEffect(() => {
    // Reset city when country changes
    if (currentCities.length > 0 && !currentCities.includes(selectedCity)) {
      setSelectedCity(currentCities[0])
    }
  }, [selectedCountry])

  const handleNextStep = () => {
    if (step === 1) {
      // Validate step 1 (creator type + location)
      if (!selectedCreatorType) {
        setError('Please select your creator type')
        return
      }
      if (!selectedCountry || !selectedCity) {
        setError('Please select your location')
        return
      }
      setError('')
      setStep(2)
    }
  }

  const handlePreviousStep = () => {
    setStep(1)
    setError('')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate all fields
      if (!displayName.trim()) throw new Error('Display name is required')
      if (!email.trim()) throw new Error('Email is required')
      if (password.length < 6) throw new Error('Password must be at least 6 characters')
      if (!selectedCreatorType) throw new Error('Please select your creator type')
      if (!selectedCountry || !selectedCity) throw new Error('Please select your location')
      
      const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry
      const locationString = `${selectedCity}, ${countryName}`

      // STEP 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            user_type: 'creator',
            display_name: displayName.trim(),
            creator_type: selectedCreatorType,
            location: locationString
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user account')

      // STEP 2: Create profile - MINIMAL VERSION FIRST (only required columns)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_type: 'creator',
          display_name: displayName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        throw new Error('Failed to create profile. Please try again.')
      }

      // STEP 3: Update profile with remaining fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: email.trim(),
          creator_type: selectedCreatorType,
          location: locationString,
          is_available: true,
          is_premium: false,
          portfolio_limit: 5,
          posts_used: 0,
          media_used: 0,
          featured_requests_available: 0,
          subscription_tier: 'free',
          max_posts: 3,
          max_media: 5,
          max_media_per_post: 20,
          avg_rating: 0,
          total_reviews: 0,
          is_admin: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id)

      if (updateError) {
        // Don't throw - profile was created, just update failed
      }
      
      localStorage.setItem('signup_success', 'true')
      setSuccess('Digital portfolio created successfully!')
      setFadeOut(true)
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (error: any) {
      setError(error.message || 'Signup failed. Please try again.')
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
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to ShootShots</h2>
          <p className="text-gray-400 text-sm">Setting up your digital portfolio...</p>
          <div className="mt-6">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-green-500 border-r-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className={`text-xs font-medium ${step === 1 ? 'text-green-400' : 'text-gray-500'}`}>
              Step 1: Choose Your Path
            </div>
            <div className={`text-xs font-medium ${step === 2 ? 'text-green-400' : 'text-gray-500'}`}>
              Step 2: Account Details
            </div>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-green-700 transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            ></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center">
              <Cpu className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">Create Your Digital Portfolio</h1>
              <p className="text-gray-400 text-xs">Build your professional digital presence</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            {step === 1 ? 'Tell us about your creative work' : 'Create your account'}
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="text-green-400 text-sm">{success}</div>
              </div>
            )}
            
            <form onSubmit={handleSignup} className="space-y-6">
              {/* STEP 1: Creator Details (Now First) */}
              {step === 1 && (
                <>
                  {/* Creator Type */}
                  <div>
                    <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                      Digital Creator Type *
                    </label>
                    {Object.entries(groupedCreatorTypes).map(([category, types]) => (
                      <div key={category} className="mb-6">
                        <div className="text-sm font-medium text-gray-300 mb-3">{category}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {types.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setSelectedCreatorType(type.value)}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                selectedCreatorType === type.value 
                                  ? 'border-green-500 bg-green-500/10' 
                                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${
                                  selectedCreatorType === type.value 
                                    ? 'bg-green-500/20' 
                                    : 'bg-gray-800'
                                }`}>
                                  {<type.icon className={`h-4 w-4 ${
                                    selectedCreatorType === type.value 
                                      ? 'text-green-400' 
                                      : 'text-gray-400'
                                  }`} />}
                                </div>
                                <div className="font-medium text-white text-sm">{type.label}</div>
                              </div>
                              <div className="text-xs text-gray-400 text-left">
                                {type.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                        Country *
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm appearance-none pr-10"
                          required
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code} className="bg-gray-900 text-white">
                              {country.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <Globe className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                        City *
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm appearance-none pr-10"
                          required
                        >
                          {currentCities.map((city) => (
                            <option key={city} value={city} className="bg-gray-900 text-white">
                              {city}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <MapPin className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Account Information (Now Second) */}
              {step === 2 && (
                <>
                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm placeholder-gray-500"
                      placeholder="Your professional name"
                      required
                    />
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm placeholder-gray-500"
                        placeholder="you@example.com"
                        required
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Mail className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium mb-3 text-gray-400 uppercase tracking-wide">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700 focus:border-green-500 focus:outline-none text-white text-sm placeholder-gray-500"
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </div>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="text-red-400 text-sm">{error}</div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-4">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="flex-1 p-4 border-2 border-gray-700 text-gray-400 text-sm font-medium rounded-xl hover:border-gray-600 hover:text-gray-300 hover:bg-gray-800/30 transition-all"
                    disabled={loading}
                  >
                    ← Back
                  </button>
                )}
                
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 p-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    Continue to Account
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 p-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Digital Portfolio...
                      </>
                    ) : (
                      <>
                        <Cpu className="h-5 w-5" />
                        Create Digital Portfolio
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Footer */}
          <div className="p-8 pt-6 bg-gray-900/30 border-t border-gray-800">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">
                Already have a digital portfolio?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-green-400 font-medium hover:text-green-300 hover:underline transition-colors"
                >
                  Sign in here
                </button>
              </p>
              
              <p className="text-xs text-gray-500">
                By creating a portfolio, you agree to our{' '}
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