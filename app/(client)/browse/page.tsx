'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import VideoPreview from '@/components/common/VideoPreview'
import { supabase } from '@/lib/supabase/client'
import { Search, Grid, List, Star, TrendingUp, Clock, X, Filter, MessageCircle, ChevronDown, MapPin, MessageCircle as WhatsAppIcon, Share2, Heart, Eye, Copy, Twitter, Facebook, Check, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import LikeSaveButtons from '@/components/interactions/LikeSaveButtons'
import { trackView } from '@/lib/utils/viewTracker'
import { feedCache } from '@/lib/FeedCache'

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest', icon: <Clock size={16} /> },
  { id: 'trending', label: 'Trending', icon: <TrendingUp size={16} /> },
  { id: 'featured', label: 'Featured', icon: <Star size={16} /> },
  { id: 'most_viewed', label: 'Most Viewed', icon: <TrendingUp size={16} /> }
]

const LOCATIONS = [
  { id: 'lagos', name: 'Lagos', shortName: 'Lagos', dbValue: 'Lagos' },
  { id: 'abuja', name: 'Abuja', shortName: 'Abuja', dbValue: 'Abuja' },
  { id: 'ph', name: 'Port Harcourt', shortName: 'PH', dbValue: 'PH' }
]

interface Category {
  id: string;
  name: string;
  icon: string;
  display_order: number;
}

interface CategoryWithCount extends Category {
  item_count: number;
  has_content: boolean;
}

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  is_featured: boolean
  view_count: number
  like_count: number
  save_count: number
  created_at: string
  media_count: number
  cover_media_url: string
  profiles?: {
    id: string
    display_name: string
    location?: string
    profile_image_url?: string
    creator_type?: string
  }
  portfolio_media: {
    media_url: string
    media_type: 'image' | 'video'
    display_order: number
  }[]
}

// ALGORITHMIC SHUFFLE
function shuffleWithWeights(items: PortfolioItem[], seed: number): PortfolioItem[] {
  if (!items.length) return []
  
  const shuffled = [...items]
  const random = () => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }
  
  const weightedItems = shuffled.map(item => {
    let weight = 1.0
    
    if (item.is_featured) weight *= 1.8
    
    const engagementScore = ((item.view_count * 0.3) + (item.like_count * 0.5) + (item.save_count * 0.2)) / 100
    weight *= (1 + Math.min(engagementScore, 2))
    
    const daysOld = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysOld < 1) weight *= 1.5
    else if (daysOld < 3) weight *= 1.3
    else if (daysOld < 7) weight *= 1.2
    else if (daysOld > 30) weight *= 0.8
    
    return { item, weight }
  })
  
  for (let i = weightedItems.length - 1; i > 0; i--) {
    const currentWeight = weightedItems[i].weight
    const j = Math.floor(random() * (i + 1) * currentWeight)
    const swapIndex = Math.min(j, i)
    ;[weightedItems[i], weightedItems[swapIndex]] = [weightedItems[swapIndex], weightedItems[i]]
  }
  
  return weightedItems.map(w => w.item)
}

// CONTENT VARIETY
function ensureContentVariety(items: PortfolioItem[]): PortfolioItem[] {
  if (items.length <= 10) return items
  
  const categories = new Map()
  const result = []
  const remaining = []
  
  for (const item of items) {
    const category = item.category || 'Uncategorized'
    if (!categories.has(category)) {
      categories.set(category, true)
      result.push(item)
    } else {
      remaining.push(item)
    }
  }
  
  const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5)
  const categoryBuckets = new Map()
  
  for (const item of [...result, ...shuffledRemaining]) {
    const category = item.category || 'Uncategorized'
    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(category, [])
    }
    categoryBuckets.get(category).push(item)
  }
  
  const finalResult = []
  let index = 0
  let hasItems = true
  
  while (hasItems) {
    hasItems = false
    for (const [, bucket] of categoryBuckets.entries()) {
      if (bucket[index]) {
        finalResult.push(bucket[index])
        hasItems = true
      }
    }
    index++
  }
  
  return finalResult.slice(0, 40)
}

export default function BrowsePage() {
  const router = useRouter()
  
  // State
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [categoriesWithCount, setCategoriesWithCount] = useState<CategoryWithCount[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PortfolioItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [viewCountUpdates, setViewCountUpdates] = useState<Record<string, number>>({})
  const [sessionSeed, setSessionSeed] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const hasLoadedRef = useRef(false)

  // CHECK CACHE ON MOUNT
  useEffect(() => {
    if (hasLoadedRef.current) return
    
    const cacheKey = `browse_${selectedCategories.join(',')}_${selectedLocations.join(',')}_${sortBy}`
    const cachedData = feedCache.get<PortfolioItem[]>(cacheKey)
    
    if (cachedData) {
      setItems(cachedData.data)
      setSessionSeed(cachedData.seed)
      hasLoadedRef.current = true
    } else {
      const seed = Math.floor(Math.random() * 10000)
      setSessionSeed(seed)
      loadCategoriesWithCounts()
      loadItems(seed, 1)
      hasLoadedRef.current = true
    }
  }, [])

  // LOAD ITEMS WHEN FILTERS CHANGE
  useEffect(() => {
    if (hasLoadedRef.current && (selectedCategories.length > 0 || selectedLocations.length > 0)) {
      const seed = Math.floor(Math.random() * 10000)
      setSessionSeed(seed)
      loadItems(seed, 1)
    }
  }, [selectedCategories, selectedLocations, sortBy])

  async function loadCategoriesWithCounts() {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, icon, display_order')
        .order('display_order')

      if (categoriesError) throw categoriesError

      const { data: counts, error: countsError } = await supabase
        .from('portfolio_items')
        .select('category')
        .not('category', 'is', null)

      if (countsError) throw countsError

      const categoryCounts: Record<string, number> = {}
      counts?.forEach(item => {
        if (item.category) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
        }
      })

      const combined = categories?.map(category => ({
        ...category,
        item_count: categoryCounts[category.name] || 0,
        has_content: (categoryCounts[category.name] || 0) > 0
      })) || []

      setCategoriesWithCount(combined)
    } catch (error) {
    }
  }

  async function loadItems(seed: number, pageNum = 1) {
    setLoading(true)
    try {
      const start = (pageNum - 1) * 40
      
      let query = supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles!portfolio_items_creator_id_fkey(
            id,
            display_name,
            location,
            profile_image_url,
            creator_type
          ),
          portfolio_media (
            media_url,
            media_type,
            display_order
          )
        `)

      if (selectedCategories.length > 0) {
        query = query.in('category', selectedCategories)
      }

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'most_viewed':
          query = query.order('view_count', { ascending: false })
          break
        case 'featured':
          query = query.order('is_featured', { ascending: false })
                    .order('created_at', { ascending: false })
          break
      }

      const { data, error } = await query.range(start, start + 39)

      if (error) throw error
      
      let filteredData = data || []
      
      if (selectedLocations.length > 0) {
        filteredData = filteredData.filter(item => 
          item.profiles?.location && selectedLocations.includes(item.profiles.location)
        )
      }
      
      const shuffledItems = shuffleWithWeights(filteredData, seed + pageNum)
      const variedItems = ensureContentVariety(shuffledItems)
      
      if (pageNum === 1) {
        setItems(variedItems)
        
        const cacheKey = `browse_${selectedCategories.join(',')}_${selectedLocations.join(',')}_${sortBy}`
        feedCache.set(cacheKey, variedItems, seed)
      } else {
        const newItems = [...items, ...variedItems]
        setItems(newItems)
      }
      
      setPage(pageNum)
      
      if (filteredData.length < 40) {
        setHasMore(false)
      }
      
    } catch (error) {
      setItems([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  async function refreshBrowse() {
    setIsRefreshing(true)
    const newSeed = Math.floor(Math.random() * 10000)
    setSessionSeed(newSeed)
    setPage(1)
    setHasMore(true)
    
    const cacheKey = `browse_${selectedCategories.join(',')}_${selectedLocations.join(',')}_${sortBy}`
    feedCache.clear(cacheKey)
    
    await loadItems(newSeed, 1)
    setIsRefreshing(false)
  }

  async function performSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const { data: searchData, error } = await supabase
        .rpc('search_portfolio_items', { search_query: searchQuery })
        .limit(100)

      if (error) {
        await fallbackDirectSearch(searchQuery)
        return
      }
      
      if (!searchData || searchData.length === 0) {
        setSearchResults([])
        setIsSearching(false)
        return
      }
      
      const transformedResults: PortfolioItem[] = searchData.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        is_featured: item.is_featured || false,
        view_count: item.view_count || 0,
        like_count: item.like_count || 0,
        save_count: item.save_count || 0,
        created_at: item.created_at,
        media_count: item.media_count || 1,
        cover_media_url: item.cover_media_url || '',
        profiles: item.creator_id ? {
          id: item.creator_id,
          display_name: item.creator_name || '',
          location: item.creator_location || '',
          profile_image_url: item.creator_profile_image_url || '',
          creator_type: item.creator_type || ''
        } : undefined,
        portfolio_media: item.media_url ? [{
          media_url: item.media_url,
          media_type: item.media_type || 'image',
          display_order: 0
        }] : []
      }))

      let filteredResults = transformedResults
      
      if (selectedLocations.length > 0) {
        filteredResults = filteredResults.filter(item => 
          item.profiles?.location && selectedLocations.includes(item.profiles.location)
        )
      }
      
      if (selectedCategories.length > 0) {
        filteredResults = filteredResults.filter(item => 
          item.category && selectedCategories.includes(item.category)
        )
      }

      const sortedResults = sortItems(filteredResults, sortBy)
      setSearchResults(sortedResults)
      
    } catch (error) {
      await fallbackDirectSearch(searchQuery)
    } finally {
      setIsSearching(false)
    }
  }

  async function fallbackDirectSearch(searchQuery: string) {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles!portfolio_items_creator_id_fkey(
            id,
            display_name,
            location,
            profile_image_url,
            creator_type
          ),
          portfolio_media (
            media_url,
            media_type,
            display_order
          )
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,profiles.display_name.ilike.%${searchQuery}%,profiles.location.ilike.%${searchQuery}%`)
        .limit(100)
        .order('created_at', { ascending: false })

      if (error) {
        setSearchResults([])
        return
      }
      
      if (!data || data.length === 0) {
        setSearchResults([])
        return
      }

      let filteredData = data
      
      if (selectedLocations.length > 0) {
        filteredData = filteredData.filter(item => 
          item.profiles?.location && selectedLocations.includes(item.profiles.location)
        )
      }
      
      if (selectedCategories.length > 0) {
        filteredData = filteredData.filter(item => 
          item.category && selectedCategories.includes(item.category)
        )
      }

      const sortedResults = sortItems(filteredData, sortBy)
      setSearchResults(sortedResults)
      
    } catch (fallbackError) {
      setSearchResults([])
    }
  }

  function sortItems(results: PortfolioItem[], sortType: string): PortfolioItem[] {
    switch (sortType) {
      case 'newest':
        return [...results].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'most_viewed':
        return [...results].sort((a, b) => b.view_count - a.view_count)
      case 'featured':
        return [...results].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1
          if (!a.is_featured && b.is_featured) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      default:
        return results
    }
  }

  const toggleCategory = (categoryName: string) => {
    const newSelected = selectedCategories.includes(categoryName)
      ? selectedCategories.filter(c => c !== categoryName)
      : [...selectedCategories, categoryName]
    
    setSelectedCategories(newSelected)
    
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  const toggleLocation = (locationDbValue: string) => {
    const newSelected = selectedLocations.includes(locationDbValue)
      ? selectedLocations.filter(l => l !== locationDbValue)
      : [...selectedLocations, locationDbValue]
    
    setSelectedLocations(newSelected)
    
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  const clearCategoryFilters = () => {
    setSelectedCategories([])
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  const clearLocationFilters = () => {
    setSelectedLocations([])
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedLocations([])
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }

  const handleViewUpdate = (itemId: string) => {
    setViewCountUpdates(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }))
  }

  const displayItems = searchQuery.trim() ? searchResults : items

  if (loading && page === 1 && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* DARK GREEN HEADER */}
      <header className="sticky top-0 z-50 border-b border-green-800 bg-green-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Portfolio</h1>
              <p className="text-green-200 text-sm">Discover amazing content</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={refreshBrowse}
                disabled={isRefreshing}
                className="text-sm text-green-200 hover:text-white flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <Link href="/" className="text-sm text-green-200 hover:text-white">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search portfolios..."
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 text-lg text-gray-900"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button
                onClick={performSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-4 bg-green-900 text-white rounded-xl font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedCategories.length > 0 ? 'bg-green-900 border-green-800 text-white' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                >
                  <Filter size={16} />
                  Categories
                  {selectedCategories.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                      {selectedCategories.length}
                    </span>
                  )}
                  <ChevronDown size={16} className={`transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryFilter && (
                  <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-xl shadow-xl z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Filter by Category</h3>
                        {selectedCategories.length > 0 && (
                          <button onClick={clearCategoryFilters} className="text-sm text-red-600 hover:text-red-800">
                            Clear all
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2">
                        {categoriesWithCount.map((category) => (
                          <label
                            key={category.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              category.has_content 
                                ? 'hover:bg-gray-100' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(category.name)}
                                onChange={() => category.has_content && toggleCategory(category.name)}
                                disabled={!category.has_content}
                                className={`w-4 h-4 rounded border-gray-400 bg-white ${
                                  category.has_content 
                                    ? 'text-green-600 focus:ring-green-500' 
                                    : 'text-gray-400'
                                } focus:ring-offset-white`}
                              />
                              <span className={`text-sm ${category.has_content ? 'text-gray-900' : 'text-gray-500'}`}>
                                {category.name}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              category.has_content
                                ? selectedCategories.includes(category.name)
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-700'
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              {category.item_count}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowLocationFilter(!showLocationFilter)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedLocations.length > 0 ? 'bg-green-900 border-green-800 text-white' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                >
                  <MapPin size={16} />
                  Location
                  {selectedLocations.length > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                      {selectedLocations.length}
                    </span>
                  )}
                  <ChevronDown size={16} className={`transition-transform ${showLocationFilter ? 'rotate-180' : ''}`} />
                </button>

                {showLocationFilter && (
                  <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-xl shadow-xl z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Filter by Location</h3>
                        {selectedLocations.length > 0 && (
                          <button onClick={clearLocationFilters} className="text-sm text-red-600 hover:text-red-800">
                            Clear all
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {LOCATIONS.map((location) => (
                          <label
                            key={location.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLocations.includes(location.dbValue)}
                                onChange={() => toggleLocation(location.dbValue)}
                                className="w-4 h-4 rounded border-gray-400 bg-white text-green-600 focus:ring-green-500 focus:ring-offset-white"
                              />
                              <span className="text-sm text-gray-900">{location.name}</span>
                            </div>
                            <span className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded">
                              {location.shortName}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(selectedCategories.length > 0 || selectedLocations.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                  <X size={14} />
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {(selectedCategories.length > 0 || selectedLocations.length > 0) && (
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">Active filters:</div>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(category => {
                const categoryInfo = categoriesWithCount.find(c => c.name === category)
                return (
                  <div
                    key={category}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full"
                  >
                    <span className="text-sm text-gray-900">{category}</span>
                    {categoryInfo?.item_count && categoryInfo.item_count > 0 && (
                      <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full">
                        {categoryInfo.item_count}
                      </span>
                    )}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}

              {selectedLocations.map(locationDbValue => {
                const locationInfo = LOCATIONS.find(l => l.dbValue === locationDbValue)
                return (
                  <div
                    key={locationDbValue}
                    className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full"
                  >
                    <MapPin size={12} className="text-gray-600" />
                    <span className="text-sm text-gray-900">{locationInfo?.name || locationDbValue}</span>
                    <button
                      onClick={() => toggleLocation(locationDbValue)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-600">
            {searchQuery.trim() ? (
              isSearching ? (
                'Searching...'
              ) : searchResults.length === 0 ? (
                `No results found for "${searchQuery}"`
              ) : (
                `Found ${searchResults.length} post${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`
              )
            ) : (
              `Showing ${items.length} portfolio posts`
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <Grid size={16} className={viewMode === 'grid' ? 'text-green-600' : 'text-gray-600'} />
              </button>
              <button
                onClick={() => setViewMode('masonry')}
                className={`p-2 rounded ${viewMode === 'masonry' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <List size={16} className={viewMode === 'masonry' ? 'text-green-600' : 'text-gray-600'} />
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                if (searchQuery.trim()) {
                  performSearch()
                }
              }}
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-green-600 text-gray-900"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  Sort by: {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-20">
            {searchQuery.trim() || selectedCategories.length > 0 || selectedLocations.length > 0 ? (
              <>
                <div className="text-gray-600 text-lg mb-2">
                  {searchQuery.trim() 
                    ? `No results found for "${searchQuery}"`
                    : 'No posts found with selected filters'
                  }
                </div>
                <p className="text-gray-500 mb-4">
                  {searchQuery.trim() 
                    ? 'Try different keywords or check spelling'
                    : 'Try adjusting your filters'
                  }
                </p>
                <button
                  onClick={searchQuery.trim() ? clearSearch : clearAllFilters}
                  className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800"
                >
                  Clear {searchQuery.trim() ? 'Search' : 'Filters'}
                </button>
              </>
            ) : (
              <div className="text-gray-600">No portfolio posts found</div>
            )}
          </div>
        ) : (
          <PortfolioGrid 
            items={displayItems} 
            viewMode={viewMode} 
            router={router}
            onViewUpdate={handleViewUpdate}
            viewCountUpdates={viewCountUpdates}
          />
        )}

        {loading && page > 1 && (
          <div className="flex justify-center py-6">
            <div className="text-gray-600 text-sm">Loading more...</div>
          </div>
        )}
      </main>

      {(showCategoryFilter || showLocationFilter) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowCategoryFilter(false)
            setShowLocationFilter(false)
          }}
        />
      )}
    </div>
  )
}

function PortfolioCard({ 
  item, 
  router,
  onViewUpdate,
  viewCountUpdates 
}: { 
  item: PortfolioItem
  router: any
  onViewUpdate: (itemId: string) => void
  viewCountUpdates: Record<string, number>
}) {
  const coverMedia = item.portfolio_media?.find(m => m.display_order === 0) || 
                   item.portfolio_media?.[0]
  const hasMultipleMedia = item.media_count > 1
  const localUpdateCount = viewCountUpdates[item.id] || 0
  const displayViewCount = item.view_count + localUpdateCount
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showShareMenu && shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShareMenu])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const handleCardClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    
    const clickedButton = target.closest('button')
    const clickedLink = target.closest('a')
    const clickedInteractive = target.closest('[data-no-navigate]')
    const clickedShareMenu = target.closest('[data-share-menu]')
    
    if (clickedButton || clickedLink || clickedInteractive || clickedShareMenu) {
      return
    }
    
    const success = await trackView(item.id)
    if (success) {
      onViewUpdate(item.id)
    }
    
    router.push(`/portfolio/${item.id}`)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/portfolio/${item.id}`
    navigator.clipboard.writeText(url)
      .then(() => {
        setToastMessage('Link copied!')
        setToastType('success')
        setShowShareMenu(false)
      })
      .catch(() => {
        setToastMessage('Failed to copy link')
        setToastType('error')
      })
  }

  const shareToWhatsApp = () => {
    const url = `${window.location.origin}/portfolio/${item.id}`
    const text = `Check out this portfolio post by ${item.profiles?.display_name || 'a creator'}: ${item.title || 'Amazing work'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`, '_blank')
    setShowShareMenu(false)
  }

  const shareToTwitter = () => {
    const url = `${window.location.origin}/portfolio/${item.id}`
    const text = `Check out this amazing work by ${item.profiles?.display_name || 'a creator'} on Shootshots!`
    const hashtags = 'photography,portfolio,creatives'
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags)}`, '_blank')
    setShowShareMenu(false)
  }

  const shareToFacebook = () => {
    const url = `${window.location.origin}/portfolio/${item.id}`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    setShowShareMenu(false)
  }

  const shareNative = async () => {
    const url = `${window.location.origin}/portfolio/${item.id}`
    const text = `Check out this portfolio: ${item.title || 'Amazing work'} by ${item.profiles?.display_name || 'a creator'}`

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: item.title || 'Portfolio Post',
          text: text,
          url: url,
        })
        setShowShareMenu(false)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyLink()
        }
      }
    } else {
      copyLink()
    }
  }

  return (
    <div 
      className="bg-white rounded-lg overflow-hidden hover:opacity-95 transition-opacity cursor-pointer border border-gray-200 shadow-sm hover:shadow-md"
      onClick={handleCardClick}
    >
      {toastMessage && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg z-50 flex items-center gap-2 ${
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white text-sm shadow-lg animate-in slide-in-from-right-5`}>
          {toastType === 'success' ? (
            <Check size={16} className="text-white" />
          ) : null}
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative aspect-square">
        {coverMedia?.media_type === 'image' ? (
          <img
            src={coverMedia.media_url || item.cover_media_url}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <VideoPreview
            src={coverMedia?.media_url}
            poster={item.cover_media_url}
            className="w-full h-full object-cover"
          />
        )}
        
        {hasMultipleMedia && (
          <div className="absolute top-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
            +{item.media_count - 1}
          </div>
        )}
        
        {item.is_featured && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 border border-gray-300">
            <Star className="fill-green-600 text-green-600" size={14} />
          </div>
        )}
      </div>

      <div className="p-4">
        <div 
          className="flex items-center gap-2 mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Link 
            href={`/creator/${item.profiles?.id}`}
            className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 hover:opacity-80"
          >
            {item.profiles?.profile_image_url ? (
              <img
                src={item.profiles.profile_image_url}
                alt={item.profiles.display_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="text-xs text-gray-600">
                {item.profiles?.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link 
              href={`/creator/${item.profiles?.id}`}
              className="font-medium text-sm hover:underline line-clamp-1 text-gray-900"
            >
              {item.profiles?.display_name || 'Unknown'}
            </Link>
            <div className="text-xs text-gray-600">
              {item.profiles?.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {item.profiles.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-3">
          {item.title && (
            <div className="font-semibold text-sm mb-1 line-clamp-1 text-gray-900">
              {item.title}
            </div>
          )}
          {item.description && (
            <div className="text-xs text-gray-600 line-clamp-2">
              {item.description}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="inline-block bg-green-50 text-green-800 px-2 py-1 rounded text-xs border border-green-100">
            {item.category}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Eye size={10} />
              <span>{displayViewCount} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={10} />
              <span>{item.like_count}</span>
            </div>
          </div>
        </div>

        <div 
          className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()}
          data-no-navigate="true"
        >
          <div className="flex items-center gap-2">
            <div data-no-navigate="true">
              <LikeSaveButtons 
                itemId={item.id}
                initialLikeCount={item.like_count || 0}
                initialSaveCount={item.save_count || 0}
                size="sm"
                showCounts={false}
              />
            </div>
            <button 
              className="text-gray-500 hover:text-gray-900 ml-1"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <MessageCircle size={12} />
            </button>
          </div>
          
          <div className="relative" data-share-menu="true">
            <button 
              className="text-gray-500 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation()
                setShowShareMenu(!showShareMenu)
              }}
            >
              <Share2 size={12} />
            </button>
            
            {showShareMenu && (
              <div 
                ref={shareMenuRef}
                className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-300 rounded-lg shadow-xl z-50"
              >
                <div className="py-2">
                  <button
                    onClick={copyLink}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-900"
                  >
                    <Copy size={14} className="text-gray-600" />
                    <span>Copy Link</span>
                  </button>
                  <button
                    onClick={shareToWhatsApp}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-900"
                  >
                    <WhatsAppIcon size={14} className="text-gray-600" />
                    <span>Share to WhatsApp</span>
                  </button>
                  <button
                    onClick={shareToTwitter}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-900"
                  >
                    <Twitter size={14} className="text-gray-600" />
                    <span>Share to Twitter</span>
                  </button>
                  <button
                    onClick={shareToFacebook}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-900"
                  >
                    <Facebook size={14} className="text-gray-600" />
                    <span>Share to Facebook</span>
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={shareNative}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-3 text-gray-900"
                    >
                      <Share2 size={14} className="text-gray-600" />
                      <span>Share via...</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PortfolioGridProps {
  items: PortfolioItem[]
  viewMode: 'grid' | 'masonry'
  router: any
  onViewUpdate: (itemId: string) => void
  viewCountUpdates: Record<string, number>
}

function PortfolioGrid({ items, viewMode, router, onViewUpdate, viewCountUpdates }: PortfolioGridProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item, index) => (
          <PortfolioCard
            key={`${item.id}-${index}`}
            item={item}
            router={router}
            onViewUpdate={onViewUpdate}
            viewCountUpdates={viewCountUpdates}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
      {items.map((item, index) => (
        <div key={`${item.id}-${index}`} className="break-inside-avoid">
          <PortfolioCard
            item={item}
            router={router}
            onViewUpdate={onViewUpdate}
            viewCountUpdates={viewCountUpdates}
          />
        </div>
      ))}
    </div>
  )
}