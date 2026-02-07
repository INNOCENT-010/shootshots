'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { DollarSign, Users, FileImage, Folder, Edit, Save, X, AlertCircle, Check, Crown, Star, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SubscriptionPlan {
  id: string
  plan_type: string
  display_name: string
  description: string
  max_posts: number
  max_media: number
  max_media_per_post: number
  price_monthly: number
  is_active: boolean
  features: string[]
  user_count: number
  total_posts: number
  total_media: number
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({})
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadPlans()
    }
  }, [user])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      router.push('/login?redirect=/admin/plans')
      return
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
    
    if (!profile?.is_admin) {
      router.push('/')
      return
    }
    
    setUser(session.user)
  }

  async function loadPlans() {
    try {
      // Use RPC or direct query
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          profiles!current_plan_type(count)
        `)
        .order('price_monthly')

      if (error) throw error
      
      // Transform data
      const transformedPlans: SubscriptionPlan[] = (plansData || []).map(plan => ({
        id: plan.id,
        plan_type: plan.plan_type,
        display_name: plan.display_name,
        description: plan.description,
        max_posts: plan.max_posts,
        max_media: plan.max_media,
        max_media_per_post: plan.max_media_per_post,
        price_monthly: plan.price_monthly,
        is_active: plan.is_active,
        features: plan.features || [],
        user_count: plan.profiles?.length || 0,
        total_posts: 0, // Will need to calculate
        total_media: 0  // Will need to calculate
      }))

      setPlans(transformedPlans)
      
      // Load usage statistics
      await loadPlanStats(transformedPlans)
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load plans' })
    } finally {
      setLoading(false)
    }
  }

  async function loadPlanStats(plansList: SubscriptionPlan[]) {
    try {
      // Get user counts per plan
      const { data: userStats } = await supabase
        .from('profiles')
        .select('current_plan_type, posts_used, media_used')
      
      if (!userStats) return
      
      // Calculate totals per plan
      const planStats = plansList.map(plan => {
        const planUsers = userStats.filter(u => u.current_plan_type === plan.plan_type)
        const totalPosts = planUsers.reduce((sum, user) => sum + (user.posts_used || 0), 0)
        const totalMedia = planUsers.reduce((sum, user) => sum + (user.media_used || 0), 0)
        
        return {
          ...plan,
          user_count: planUsers.length,
          total_posts: totalPosts,
          total_media: totalMedia
        }
      })
      
      setPlans(planStats)
    } catch (error) {
    }
  }

  function startEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan.id)
    setEditForm({
      max_posts: plan.max_posts,
      max_media: plan.max_media,
      max_media_per_post: plan.max_media_per_post,
      price_monthly: plan.price_monthly,
      features: plan.features
    })
  }

  async function savePlan(planId: string) {
    if (!editForm.max_posts || !editForm.max_media) {
      setMessage({ type: 'error', text: 'Please fill all required fields' })
      return
    }

    setSaving(true)
    try {
      // Use RPC function or direct update
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          max_posts: editForm.max_posts,
          max_media: editForm.max_media,
          max_media_per_post: editForm.max_media_per_post || 5,
          price_monthly: editForm.price_monthly,
          features: editForm.features || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Plan updated successfully!' })
      setEditingPlan(null)
      await loadPlans()
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save plan' })
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setEditingPlan(null)
    setEditForm({})
  }

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro': return <Crown className="text-yellow-400" size={20} />
      case 'premium': return <Star className="text-purple-400" size={20} />
      default: return <Check className="text-gray-400" size={20} />
    }
  }

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'pro': return 'border-yellow-500/30'
      case 'premium': return 'border-purple-500/30'
      default: return 'border-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading plans...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Plans Management</h1>
        <p className="text-gray-400">Configure plans and limits for different user tiers</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-700' 
            : 'bg-red-900/30 border border-red-700'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-5 w-5 mr-2 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-gray-900 rounded-xl p-6 border-2 ${getPlanColor(plan.plan_type)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlanIcon(plan.plan_type)}
                <div>
                  <h3 className="text-xl font-bold">{plan.display_name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${plan.price_monthly}</div>
                <div className="text-sm text-gray-400">per month</div>
              </div>
            </div>

            {editingPlan === plan.id ? (
              // Edit Form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Posts</label>
                  <input
                    type="number"
                    value={editForm.max_posts || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      max_posts: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Max Media Files</label>
                  <input
                    type="number"
                    value={editForm.max_media || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      max_media: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Max Media Per Post</label>
                  <input
                    type="number"
                    value={editForm.max_media_per_post || 5}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      max_media_per_post: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    min="1"
                    max="10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={editForm.price_monthly || ''}
                    onChange={(e) => setEditForm(prev => ({ 
                      ...prev, 
                      price_monthly: parseFloat(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => savePlan(plan.id)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display View
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Posts</span>
                    <span className="font-medium">{plan.max_posts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Media Files</span>
                    <span className="font-medium">{plan.max_media}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Max Media Per Post</span>
                    <span className="font-medium">{plan.max_media_per_post}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Monthly Price</span>
                    <span className="font-medium">${plan.price_monthly}</span>
                  </div>
                </div>

                {/* Statistics */}
                <div className="border-t border-gray-800 pt-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <Users className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <div className="text-lg font-bold">{plan.user_count}</div>
                      <div className="text-xs text-gray-400">Users</div>
                    </div>
                    <div className="text-center">
                      <Folder className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <div className="text-lg font-bold">{plan.total_posts}</div>
                      <div className="text-xs text-gray-400">Posts</div>
                    </div>
                    <div className="text-center">
                      <FileImage className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <div className="text-lg font-bold">{plan.total_media}</div>
                      <div className="text-xs text-gray-400">Media Files</div>
                    </div>
                    <div className="text-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <div className="text-lg font-bold">
                        ${(plan.user_count * plan.price_monthly).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="space-y-2">
                    {(plan.features || []).slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                    {plan.features && plan.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{plan.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => startEditPlan(plan)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit Plan
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Plan Usage Summary */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Overall Platform Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-400" size={20} />
              <div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, plan) => sum + plan.user_count, 0)}
                </div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Folder className="text-green-400" size={20} />
              <div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, plan) => sum + plan.total_posts, 0)}
                </div>
                <div className="text-sm text-gray-400">Total Posts</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <FileImage className="text-purple-400" size={20} />
              <div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, plan) => sum + plan.total_media, 0)}
                </div>
                <div className="text-sm text-gray-400">Total Media</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-yellow-400" size={20} />
              <div>
                <div className="text-2xl font-bold">
                  ${plans.reduce((sum, plan) => sum + (plan.user_count * plan.price_monthly), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">Monthly Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <div>
            <div className="font-medium">Plan Changes Notice</div>
            <div className="text-sm text-gray-300">
              Changes to plan limits will affect all users on that plan immediately. 
              Existing users exceeding new limits will be blocked from new uploads until they delete content.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}