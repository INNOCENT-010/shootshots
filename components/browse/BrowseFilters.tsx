// app/(client)/browse/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, Grid, List, Star, TrendingUp, Clock, X, Filter, ChevronDown, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { 
  PortfolioItem, 
  SearchResult, 
  SearchResultResponse,
  SupabasePortfolioItem 
} from '@/types/portfolio'

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

export default function BrowsePage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesWithCount, setCategoriesWithCount] = useState<CategoryWithCount[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [showLocationFilter, setShowLocationFilter] = useState(false)

  useEffect(() => {
    loadCategoriesWithCounts()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      loadItems()
    }
  }, [sortBy, selectedCategories, selectedLocations])

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
      console.error('Error loading categories:', error)
    }
  }

  async function loadItems() {
    setLoading(true)
    try {
      let creatorIds: string[] = []
      
      if (selectedLocations.length > 0) {
        const { data: creators, error: creatorsError } = await supabase
          .from('profiles')
          .select('id')
          .in('location', selectedLocations)
        
        if (creatorsError) throw creatorsError
        
        creatorIds = creators?.map(c => c.id) || []
        
        if (creatorIds.length === 0) {
          setItems([])
          setLoading(false)
          return
        }
      }
      
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
          )
        `)
      
      if (creatorIds.length > 0) {
        query = query.in('creator_id', creatorIds)
      }
      
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
      
      const { data, error } = await query.limit(50)
      
      if (error) throw error
      
      const portfolioData = data as SupabasePortfolioItem[]
      
      const formattedItems: PortfolioItem[] = portfolioData.map(item => ({
        id: item.id,
        media_url: item.media_url,
        media_type: item.media_type,
        title: item.title,
        description: item.description,
        category: item.category,
        is_featured: item.is_featured,
        view_count: item.view_count,
        save_count: item.save_count,
        created_at: item.created_at,
        creator_id: item.creator_id,
        profiles: item.profiles || undefined
      }))
      
      setItems(formattedItems)
    } catch (error) {
      console.error('Error loading items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    
    try {
      let creatorIds: string[] = []
      
      if (selectedLocations.length > 0) {
        const { data: creators, error: creatorsError } = await supabase
          .from('profiles')
          .select('id')
          .in('location', selectedLocations)
        
        if (creatorsError) throw creatorsError
        creatorIds = creators?.map(c => c.id) || []
        
        if (creatorIds.length === 0) {
          setSearchResults([])
          setIsSearching(false)
          return
        }
      }
      
      const { data: searchData, error } = await supabase
        .rpc('search_portfolio_items', { search_query: searchQuery })
        .limit(100)
      
      if (error) {
        await fallbackDirectSearch(searchQuery, creatorIds)
        return
      }
      
      if (!searchData || searchData.length === 0) {
        setSearchResults([])
        setIsSearching(false)
        return
      }
      
      let filteredResults = searchData
      
      if (creatorIds.length > 0) {
        filteredResults = filteredResults.filter((item: any) => 
          creatorIds.includes(item.creator_id)
        )
      }
      
      if (selectedCategories.length > 0) {
        filteredResults = filteredResults.filter((item: any) => 
          item.category && selectedCategories.includes(item.category)
        )
      }
      
      const transformedData: SearchResult[] = filteredResults.map((item: any) => ({
        id: item.id,
        media_url: item.media_url || '',
        media_type: item.media_type || 'image',
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        is_featured: item.is_featured || false,
        view_count: item.view_count || 0,
        save_count: item.save_count || 0,
        created_at: item.created_at || new Date().toISOString(),
        creator_id: item.creator_id || '',
        profiles: {
          id: item.creator_id || '',
          display_name: item.creator_name || '',
          location: item.creator_location || '',
          profile_image_url: item.creator_profile_image_url || '',
          creator_type: item.creator_type || ''
        },
        creator_name: item.creator_name,
        creator_location: item.creator_location,
        creator_profile_image_url: item.creator_profile_image_url,
        creator_type: item.creator_type,
        search_rank: item.search_rank || 0
      }))
      
      const sortedResults = sortSearchResults(transformedData, sortBy)
      setSearchResults(sortedResults)
      
    } catch (error) {
      console.error('Search error:', error)
      await fallbackDirectSearch(searchQuery, [])
    } finally {
      setIsSearching(false)
    }
  }

  async function fallbackDirectSearch(searchQuery: string, creatorIds: string[]) {
    try {
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
          )
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,profiles.display_name.ilike.%${searchQuery}%,profiles.location.ilike.%${searchQuery}%`)
        .limit(50)
        .order('created_at', { ascending: false })
      
      if (creatorIds.length > 0) {
        query = query.in('creator_id', creatorIds)
      }
      
      const { data, error } = await query
      
      if (error) {
        setSearchResults([])
        return
      }
      
      if (!data || data.length === 0) {
        setSearchResults([])
        return
      }
      
      const transformedData: SearchResult[] = data.map((item: any) => ({
        id: item.id,
        media_url: item.media_url,
        media_type: item.media_type,
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        is_featured: item.is_featured || false,
        view_count: item.view_count || 0,
        save_count: item.save_count || 0,
        created_at: item.created_at,
        creator_id: item.creator_id,
        profiles: item.profiles || undefined,
        creator_name: item.profiles?.display_name || '',
        creator_location: item.profiles?.location || '',
        creator_profile_image_url: item.profiles?.profile_image_url || '',
        creator_type: item.profiles?.creator_type || '',
        search_rank: 0
      }))
      
      let filteredResults = transformedData
      if (selectedCategories.length > 0) {
        filteredResults = filteredResults.filter(item => 
          item.category && selectedCategories.includes(item.category)
        )
      }
      
      const sortedResults = sortSearchResults(filteredResults, sortBy)
      setSearchResults(sortedResults)
      
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError)
      setSearchResults([])
    }
  }

  function sortSearchResults(results: SearchResult[], sortType: string): SearchResult[] {
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

  const displayItems = searchQuery.trim() ? searchResults : items

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Browse Portfolio</h1>
              <p className="text-gray-400 text-sm">Search and filter across all content</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-300 hover:text-white">
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search: 'wedding Lagos', 'fashion photographer', 'real estate Abuja'..."
                  className="w-full pl-12 pr-12 py-4 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-white text-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button
                onClick={performSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedCategories.length > 0 ? 'bg-red-600 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
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
                  <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Filter by Category</h3>
                        {selectedCategories.length > 0 && (
                          <button onClick={clearCategoryFilters} className="text-sm text-red-400 hover:text-red-300">
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
                                ? 'hover:bg-gray-800' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(category.name)}
                                onChange={() => category.has_content && toggleCategory(category.name)}
                                disabled={!category.has_content}
                                className={`w-4 h-4 rounded border-gray-600 bg-gray-700 ${
                                  category.has_content 
                                    ? 'text-red-500 focus:ring-red-500' 
                                    : 'text-gray-500'
                                } focus:ring-offset-gray-900`}
                              />
                              <span className={`text-sm ${category.has_content ? '' : 'text-gray-500'}`}>
                                {category.name}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              category.has_content
                                ? selectedCategories.includes(category.name)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-800 text-gray-300'
                                : 'bg-gray-900 text-gray-500'
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedLocations.length > 0 ? 'bg-red-600 border-red-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
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
                  <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Filter by Location</h3>
                        {selectedLocations.length > 0 && (
                          <button onClick={clearLocationFilters} className="text-sm text-red-400 hover:text-red-300">
                            Clear all
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {LOCATIONS.map((location) => (
                          <label
                            key={location.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLocations.includes(location.dbValue)}
                                onChange={() => toggleLocation(location.dbValue)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
                              />
                              <span className="text-sm">{location.name}</span>
                            </div>
                            <span className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
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
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
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
            <div className="text-sm text-gray-400 mb-2">Active filters:</div>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(category => {
                const categoryInfo = categoriesWithCount.find(c => c.name === category)
                return (
                  <div
                    key={category}
                    className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full"
                  >
                    <span className="text-sm">{category}</span>
                    {categoryInfo?.item_count && categoryInfo.item_count > 0 && (
                      <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                        {categoryInfo.item_count}
                      </span>
                    )}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="text-gray-400 hover:text-white"
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
                    className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full"
                  >
                    <MapPin size={12} />
                    <span className="text-sm">{locationInfo?.name || locationDbValue}</span>
                    <button
                      onClick={() => toggleLocation(locationDbValue)}
                      className="text-gray-400 hover:text-white"
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
          <div className="text-sm text-gray-400">
            {searchQuery.trim() ? (
              isSearching ? (
                'Searching...'
              ) : searchResults.length === 0 ? (
                `No results found for "${searchQuery}"`
              ) : (
                `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`
              )
            ) : (
              `Showing ${items.length} portfolio items`
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('masonry')}
                className={`p-2 rounded ${viewMode === 'masonry' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                <List size={16} />
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
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-white"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  Sort by: {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20">
            {searchQuery.trim() || selectedCategories.length > 0 || selectedLocations.length > 0 ? (
              <>
                <div className="text-gray-400 text-lg mb-2">
                  {searchQuery.trim() 
                    ? `No results found for "${searchQuery}"`
                    : 'No items found with selected filters'
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
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
                >
                  Clear {searchQuery.trim() ? 'Search' : 'Filters'}
                </button>
              </>
            ) : (
              <div className="text-gray-400">No portfolio items found</div>
            )}
          </div>
        ) : (
          <PortfolioGrid items={displayItems} viewMode={viewMode} />
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

function PortfolioGrid({ items, viewMode }: { items: SearchResult[], viewMode: 'grid' | 'masonry' }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <PortfolioCard key={item.id} item={item} />
        ))}
      </div>
    )
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
      {items.map((item) => (
        <div key={item.id} className="break-inside-avoid">
          <PortfolioCard item={item} />
        </div>
      ))}
    </div>
  )
}

function PortfolioCard({ item }: { item: SearchResult }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden hover:opacity-95 transition-opacity">
      <div className="relative aspect-square">
        {item.media_type === 'image' ? (
          <img
            src={item.media_url}
            alt={item.title || 'Portfolio'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <video
            src={item.media_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        )}
        
        {item.is_featured && (
          <div className="absolute top-2 right-2">
            <Star className="fill-white text-white" size={14} />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link 
            href={`/creator/${item.profiles?.id}`}
            className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 hover:opacity-80"
          >
            {item.profiles?.profile_image_url ? (
              <img
                src={item.profiles.profile_image_url}
                alt={item.profiles.display_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="text-xs">
                {item.profiles?.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link 
              href={`/creator/${item.profiles?.id}`}
              className="font-medium text-sm hover:underline line-clamp-1"
            >
              {item.profiles?.display_name || 'Unknown'}
            </Link>
            <div className="text-xs text-gray-400">
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
            <div className="font-semibold text-sm mb-1 line-clamp-1">
              {item.title}
            </div>
          )}
          {item.description && (
            <div className="text-xs text-gray-300 line-clamp-2">
              {item.description}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="inline-block bg-white/10 px-2 py-1 rounded text-xs">
            {item.category}
          </span>
          <div className="text-xs text-gray-400">
            {item.view_count} views
          </div>
        </div>
      </div>
    </div>
  )
}