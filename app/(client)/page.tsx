// app/(client)/page.tsx - COMPLETE WITH BLACK THEME & DIGITAL ICONS
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getUserType, getUserProfile } from '@/lib/utils/userType'
import { 
  Camera, 
  Video, 
  User, 
  Palette, 
  Film, 
  Brush, 
  Gamepad2,
  Settings, 
  Sparkles, 
  CheckCircle, 
  ArrowRight, 
  Star,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Users,
  Award,
  Globe,
  Zap,
  TrendingUp,
  Cpu,
  Code,
  Smartphone,
  Monitor,
  Cloud,
  Database,
  Shield,
  Wallet,
  Bell,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Music,
  Terminal,
  Webhook,
  Network,
  Server,
  Binary,
  Cctv,
  Mic,
  Headphones,
  Paintbrush,
  FilmIcon,
  Box,
  MousePointer,
  Scissors,
  Volume2,
  VideoIcon,
  SmartphoneIcon,
  TabletSmartphone,
  MonitorSmartphone,
  Layers,
  
  Globe2,
  Share2,
  BarChart3,
  Eye,
  Download,
  Upload,
  HardDrive,
  Wifi,
  Router,
  CpuIcon,
  MemoryStick,
  
  CircuitBoard
} from 'lucide-react'

interface UserProfile {
  profile_image_url?: string
  display_name?: string
  creator_type?: string
  slug?:string
}

// Updated digital-focused creator types with digital icons
const CREATOR_TYPES = [
  { value: 'photographer', label: 'Photographer', icon: Camera },
  { value: 'videographer', label: 'Videographer', icon: VideoIcon },
  { value: 'model', label: 'Model', icon: User },
  { value: 'photo_video', label: 'Photo+Video', icon: MonitorSmartphone },
  { value: 'graphic_designer', label: 'Graphic Designer', icon: Layers },
  { value: 'animator', label: 'Animator', icon: FilmIcon },
  { value: 'comic_artist', label: 'Comic Artist', icon: Paintbrush },
  { value: 'digital_artist', label: 'Digital Artist', icon: CpuIcon },
  { value: 'game_artist', label: 'Game Artist', icon: Gamepad2 },
  { value: 'ui_ux_designer', label: 'UI/UX Designer', icon: TabletSmartphone },
  { value: 'web_designer', label: 'Web Designer', icon: Code },
  { value: '3d_artist', label: '3D Artist', icon: Box },
  { value: 'motion_designer', label: 'Motion Designer', icon: Monitor },
  { value: 'illustrator', label: 'Illustrator', icon: MousePointer },
  { value: 'vfx_artist', label: 'VFX Artist', icon: Sparkles },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones },
  { value: 'music_producer', label: 'Music Producer', icon: Music },
  { value: 'voice_artist', label: 'Voice Artist', icon: Mic },
  { value: 'video_editor', label: 'Video Editor', icon: Scissors },
  { value: 'drone_operator', label: 'Drone Operator', icon: Cctv }
]

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userType, setUserType] = useState<'creator' | 'client' | null>(null)
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    checkUser()
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null
        setUser(currentUser)
        
        if (currentUser) {
          await loadUserData(currentUser.id)
        } else {
          setUserProfile(null)
          setUserType(null)
        }
      }
    )
    
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user || null
    setUser(currentUser)
    
    if (currentUser) {
      await loadUserData(currentUser.id)
    }
    
    setLoading(false)
  }

  async function loadUserData(userId: string) {
    try {
      const profile = await getUserProfile(userId)
      setUserProfile(profile)
      if (!userProfile?.slug) {
        const { data } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', userId)
        .single()
        
        if (data) {
          setUserProfile(prev => ({ ...prev, slug: data.slug }))
        }
      }
      
      const type = await getUserType(userId)
      setUserType(type)
    } catch (error) {
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setUserType(null)
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
    return user?.email?.split('@')[0] || 'Account'
  }

  const getCreatorTypeLabel = (type: string) => {
    const found = CREATOR_TYPES.find(t => t.value === type)
    return found ? found.label : 'Creator'
  }

  return (
    <main className="min-h-screen bg-black text-gray-100 flex flex-col">
      {/* Header - BLACK WITH GREEN ACCENTS */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm flex-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center">
                <CpuIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ShootShots</h1>
                <p className="text-gray-400 text-xs">Digital Portfolio Platform</p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-4">
              {user && userType === 'creator' && (
                <Link 
                  href="/dashboard" 
                  className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-900 flex items-center gap-2 border border-gray-800"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}
              
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="text-sm text-gray-400">Loading...</div>
                ) : user ? (
                  <div className="relative">
                    <button 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-3 text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-900 border border-gray-800"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center overflow-hidden">
                        {userProfile?.profile_image_url ? (
                          <img
                            src={userProfile.profile_image_url}
                            alt={getProfileName()}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium">
                            {getProfileInitial()}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">{getProfileName()}</div>
                        <div className="text-xs text-gray-400">
                          {userType === 'creator' 
                            ? getCreatorTypeLabel(userProfile?.creator_type || 'creator')
                            : 'Client'
                          }
                        </div>
                      </div>
                    </button>
                    
                    {dropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setDropdownOpen(false)}
                        />
                        
                        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50">
                          <div className="p-2">
                            {/* Portfolio Link */}
                            {userType === 'creator' && (
                              <div className="mb-3 p-3 bg-gray-800/50 rounded-lg">
                                <div className="text-xs text-gray-400 mb-1">Your Portfolio</div>
                                <Link 
                                  href={`${userProfile?.slug}`}
                                  target="_blank"
                                  className="text-sm text-green-400 hover:text-green-300 flex items-center gap-2"
                                  onClick={() => setDropdownOpen(false)}
                                >
                                  <ExternalLink size={14} />
                                  View Portfolio
                                </Link>
                              </div>
                            )}
                            
                            {/* Menu Items */}
                            <div className="space-y-1">
                              <Link 
                                href="/dashboard"
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                                onClick={() => setDropdownOpen(false)}
                              >
                                <LayoutDashboard size={18} />
                                Dashboard
                              </Link>
                              <Link 
                                href="/dashboard/profile" 
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                                onClick={() => setDropdownOpen(false)}
                              >
                                <User size={18} />
                                Edit Profile
                              </Link>
                              
                            </div>
                            
                            {/* Logout */}
                            <div className="border-t border-gray-800 mt-3 pt-3">
                              <button
                                onClick={() => {
                                  setDropdownOpen(false)
                                  handleLogout()
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-lg transition-colors"
                              >
                                <LogOut size={18} />
                                Logout
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-gray-900 border border-gray-800"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/signup" 
                      className="text-sm bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
                    >
                      Get Free Portfolio
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - BLACK THEME */}
      <section className="py-20 px-4 bg-gradient-to-b from-black via-gray-950 to-black">
        <div className="max-w-6xl mx-auto text-center">
          {/* Digital Badge */}
          <div className="inline-flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-gray-800">
            <CircuitBoard className="h-4 w-4" />
            <span>Digital Portfolio Platform</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent">
              Digital Portfolio Hosting
            </span>
            <br />
            <span className="text-white">For Creative Professionals</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Showcase your digital work. Connect with clients. Grow your creative business.
            Built for the digital age.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-2xl hover:shadow-green-500/20 transform hover:-translate-y-1"
            >
              <CpuIcon className="h-6 w-6" />
              Create Digital Portfolio
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-gray-300 border-2 border-gray-800 rounded-xl hover:bg-gray-900 hover:border-gray-700 transition-all"
            >
              <Terminal className="h-5 w-5" />
              Already have account
            </Link>
          </div>
          
          {/* Portfolio Link Preview */}
          <div className="inline-block bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
            <p className="text-gray-400 mb-3 text-sm font-medium">Your digital portfolio will be available at:</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-green-400 font-semibold text-lg font-mono">shootshots.com/creator/</div>
              <div className="flex items-center gap-2">
                <code className="text-white font-mono bg-gray-800 px-4 py-3 rounded-lg border border-gray-700 min-w-[220px] text-center">
                  your-digital-brand
                </code>
                <button className="p-2.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
                  <Copy className="h-4 w-4 text-gray-300" />
                </button>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-4">Share this link with clients to showcase your digital work</p>
          </div>
        </div>
      </section>

      {/* Digital Creator Types Section */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for <span className="text-green-400">Digital Creators</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              From photographers to 3D artists, we support every digital career
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Digital Visual */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-green-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl flex items-center justify-center border border-green-500/20">
                  <MonitorSmartphone className="text-green-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Digital Visual</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CREATOR_TYPES.filter(type => 
                  ['photographer', 'videographer', 'photo_video', 'ui_ux_designer'].includes(type.value)
                ).map((type) => (
                  <div key={type.value} className="flex items-center gap-2 p-2 hover:bg-gray-800/30 rounded-lg transition-colors">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                      {<type.icon className="h-3.5 w-3.5 text-green-400" />}
                    </div>
                    <span className="text-gray-300 text-sm">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Digital Arts */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <CpuIcon className="text-purple-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Digital Arts</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CREATOR_TYPES.filter(type => 
                  ['graphic_designer', 'digital_artist', 'illustrator', 'web_designer'].includes(type.value)
                ).map((type) => (
                  <div key={type.value} className="flex items-center gap-2 p-2 hover:bg-gray-800/30 rounded-lg transition-colors">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                      {<type.icon className="h-3.5 w-3.5 text-purple-400" />}
                    </div>
                    <span className="text-gray-300 text-sm">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Animation & 3D */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Box className="text-blue-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Animation & 3D</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CREATOR_TYPES.filter(type => 
                  ['animator', '3d_artist', 'motion_designer', 'vfx_artist'].includes(type.value)
                ).map((type) => (
                  <div key={type.value} className="flex items-center gap-2 p-2 hover:bg-gray-800/30 rounded-lg transition-colors">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                      {<type.icon className="h-3.5 w-3.5 text-blue-400" />}
                    </div>
                    <span className="text-gray-300 text-sm">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Specialized Digital */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-amber-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                  <Gamepad2 className="text-amber-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Specialized</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CREATOR_TYPES.filter(type => 
                  ['game_artist', 'comic_artist', 'sound_designer', 'music_producer'].includes(type.value)
                ).map((type) => (
                  <div key={type.value} className="flex items-center gap-2 p-2 hover:bg-gray-800/30 rounded-lg transition-colors">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                      {<type.icon className="h-3.5 w-3.5 text-amber-400" />}
                    </div>
                    <span className="text-gray-300 text-sm">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-green-400">Digital-First</span> Features
            </h2>
            <p className="text-gray-400">Built for the modern digital creator</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-green-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl flex items-center justify-center mb-6 border border-green-500/30">
                <Server className="text-green-400 h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Cloud Portfolio</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-green-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Unlimited cloud storage for your work</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-green-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">4K video & high-res image support</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-green-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Global CDN for fast loading</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30">
                <Network className="text-blue-400 h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Digital Presence</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-blue-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Custom domain support ($1 one-time)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-blue-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">SEO optimized portfolio pages</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-blue-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Social media integration</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30">
                <Database className="text-purple-400 h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Analytics & Tools</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-purple-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Portfolio traffic analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-purple-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Client inquiry management</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-gray-800 rounded-lg mt-0.5">
                    <CheckCircle className="text-purple-400 h-4 w-4" />
                  </div>
                  <span className="text-gray-300">Digital rate cards & contracts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Digital Steps */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-green-400">3 Steps</span> to Digital Success
            </h2>
            <p className="text-gray-400">Simple setup for your digital portfolio</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600/20 to-green-800/20 text-green-400 rounded-2xl text-3xl font-bold mb-4 border border-green-500/30">
                <div className="flex items-center justify-center w-12 h-12 bg-green-600/20 rounded-xl">
                  <Terminal className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Sign Up Free</h3>
              <p className="text-gray-400">
                Create your digital account. Choose your digital career.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600/20 to-blue-800/20 text-blue-400 rounded-2xl text-3xl font-bold mb-4 border border-blue-500/30">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600/20 rounded-xl">
                  <Upload className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Upload Work</h3>
              <p className="text-gray-400">
                Add your digital portfolio, set rates, and customize.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600/20 to-purple-800/20 text-purple-400 rounded-2xl text-3xl font-bold mb-4 border border-purple-500/30">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-600/20 rounded-xl">
                  <Share2 className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Share & Grow</h3>
              <p className="text-gray-400">
                Share your digital portfolio link with clients worldwide.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-3 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-gray-900 to-black rounded-xl hover:from-black hover:to-gray-900 transition-all border border-gray-800"
            >
              <CircuitBoard className="h-5 w-5" />
              Start Building Your Digital Portfolio
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Domain Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-gray-950 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-gray-800">
            <Code className="h-4 w-4" />
            <span>Professional Digital Upgrade</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get Your <span className="text-green-400">Digital Domain</span>
          </h2>
          
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Upgrade to a custom domain for just <span className="text-green-400 font-bold">$1 one-time payment</span>
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free Option */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
              <div className="text-2xl font-bold text-white mb-2">Free Forever</div>
              <div className="text-gray-400 mb-6">Digital Portfolio</div>
              <div className="text-sm text-gray-500 mb-6 font-mono bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                shootshots.com/creator/digital-id
              </div>
              <ul className="space-y-3 text-left text-gray-400 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 h-4 w-4" />
                  <span>Full digital portfolio</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 h-4 w-4" />
                  <span>Cloud storage</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 h-4 w-4" />
                  <span>Basic analytics</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 text-lg font-medium text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
              >
                <Terminal className="h-5 w-5" />
                Start Free
              </Link>
            </div>
            
            {/* Premium Option */}
            <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-1 text-sm font-medium rounded-bl-xl">
                DIGITAL PRO
              </div>
              <div className="text-3xl font-bold text-white mb-2">$1</div>
              <div className="text-green-400 font-medium mb-6">One-time payment</div>
              <div className="text-sm text-gray-300 mb-6 font-mono bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                yourname.shootshots.com
              </div>
              <ul className="space-y-3 text-left text-gray-300 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0 h-5 w-5" />
                  <span className="font-medium">Custom digital domain</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0 h-5 w-5" />
                  <span>Professional digital presence</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0 h-5 w-5" />
                  <span>Advanced analytics dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0 h-5 w-5" />
                  <span>Priority digital support</span>
                </li>
              </ul>
              <Link
                href="/signup?plan=premium"
                className="inline-flex items-center justify-center gap-3 w-full px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
              >
                <Globe className="h-5 w-5" />
                Get Custom Domain
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600/20 to-green-800/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-green-500/30">
              <CpuIcon className="h-4 w-4" />
              <span>Digital Portfolio Ready</span>
            </div>
            
            <h3 className="text-3xl font-bold text-white mb-4">
              Build Your <span className="text-green-400">Digital Presence</span> Today
            </h3>
            
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join thousands of digital creators showcasing their work on ShootShots
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-xl hover:shadow-green-500/20"
              >
                <CpuIcon className="h-6 w-6" />
                Create Digital Portfolio
                <ArrowRight className="h-5 w-5" />
              </Link>
              
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-gray-300 border-2 border-gray-800 rounded-xl hover:bg-gray-900 hover:border-gray-700 transition-all"
              >
                <Terminal className="h-5 w-5" />
                Login to Account
              </Link>
            </div>
            
            <p className="text-gray-500 text-sm mt-8">
              No credit card required. Start free, upgrade anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-10 w-10 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center">
                  <CpuIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">ShootShots</h3>
              </div>
              <p className="text-gray-500 text-sm">Digital Portfolio Platform for Creative Professionals</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-6">
              <Link href="/about" className="hover:text-green-400 transition-colors">About</Link>
              <Link href="/terms" className="hover:text-green-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-green-400 transition-colors">Privacy</Link>
              <Link href="/contact" className="hover:text-green-400 transition-colors">Contact</Link>
              <Link href="/help" className="hover:text-green-400 transition-colors">Help</Link>
              <Link href="/creators" className="hover:text-green-400 transition-colors">For Creators</Link>
            </div>
            
            <p className="text-gray-600 text-sm">
              ©️ {new Date().getFullYear()} ShootShots. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs mt-2 max-w-md mx-auto">
              Platform features coming soon. Start building your digital portfolio today.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Add missing Copy icon component
function Copy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}