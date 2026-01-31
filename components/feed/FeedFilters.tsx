// components/feed/FeedFilters.tsx
'use client'

import { useState } from 'react'
import { Filter, MapPin, Camera, Video } from 'lucide-react'

const locations = ['All', 'Lagos', 'Abuja', 'PH']
const creatorTypes = ['All', 'Photo', 'Video', 'Mobile']
const mediaTypes = ['All', 'Images', 'Videos']

interface FeedFiltersProps {
  onFilterChange: (filters: {
    location: string
    creatorType: string
    mediaType: string
  }) => void
}

export default function FeedFilters({ onFilterChange }: FeedFiltersProps) {
  const [activeLocation, setActiveLocation] = useState('All')
  const [activeCreatorType, setActiveCreatorType] = useState('All')
  const [activeMediaType, setActiveMediaType] = useState('All')

  const handleFilterChange = (type: 'location' | 'creatorType' | 'mediaType', value: string) => {
    if (type === 'location') setActiveLocation(value)
    if (type === 'creatorType') setActiveCreatorType(value)
    if (type === 'mediaType') setActiveMediaType(value)

    onFilterChange({
      location: type === 'location' ? value : activeLocation,
      creatorType: type === 'creatorType' ? value : activeCreatorType,
      mediaType: type === 'mediaType' ? value : activeMediaType
    })
  }

  return (
    <div className="sticky top-0 z-40 border-b border-gray-800 bg-black">
      <div className="px-2 py-1">
        <div className="flex items-center justify-between overflow-x-auto hide-scrollbar">
          {/* Location filter */}
          <div className="flex items-center gap-1 shrink-0">
            <MapPin size={12} className="text-gray-400" />
            <div className="flex gap-1">
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => handleFilterChange('location', location)}
                  className={`rounded-full px-2 py-1 text-xs ${activeLocation === location ? 'bg-white text-black' : 'bg-gray-800 text-gray-300'}`}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>

          {/* Creator type filter */}
          <div className="flex items-center gap-1 shrink-0 mx-2">
            <Camera size={12} className="text-gray-400" />
            <div className="flex gap-1">
              {creatorTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('creatorType', type)}
                  className={`rounded-full px-2 py-1 text-xs ${activeCreatorType === type ? 'bg-white text-black' : 'bg-gray-800 text-gray-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Media type filter */}
          <div className="flex items-center gap-1 shrink-0">
            <Video size={12} className="text-gray-400" />
            <div className="flex gap-1">
              {mediaTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('mediaType', type)}
                  className={`rounded-full px-2 py-1 text-xs ${activeMediaType === type ? 'bg-white text-black' : 'bg-gray-800 text-gray-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}