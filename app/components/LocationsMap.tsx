'use client'

import { useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const airports = [
  {
    id: 'n9725u',
    name: 'FRG - Republic Airport',
    location: 'Farmingdale, NY',
    aircraft: 'N9725U',
    coordinates: [-73.4134, 40.7288] as [number, number],
  },
]

export default function LocationsMap() {
  const [hoveredAirport, setHoveredAirport] = useState<string | null>(null)
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)

  const activeAirport = selectedAirport || hoveredAirport

  const handleMarkerClick = (airportId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedAirport === airportId) {
      setSelectedAirport(null)
    } else {
      setSelectedAirport(airportId)
    }
  }

  const handleMapClick = () => {
    setSelectedAirport(null)
  }

  return (
    <div className="relative w-full h-full bg-gray-50" onClick={handleMapClick}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 8000,
          center: [-74.1, 40.5],
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#e5e7eb' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {airports.map((airport) => {
          const isActive = activeAirport === airport.id
          return (
            <Marker
              key={airport.id}
              coordinates={airport.coordinates}
              onMouseEnter={() => setHoveredAirport(airport.id)}
              onMouseLeave={() => setHoveredAirport(null)}
              onClick={(e: any) => handleMarkerClick(airport.id, e)}
            >
              <g style={{ cursor: 'pointer' }}>
                {/* Glow effect when active */}
                {isActive && (
                  <circle
                    r={16}
                    fill="#C59A2A"
                    opacity={0.3}
                  />
                )}
                {/* Main dot */}
                <circle
                  r={isActive ? 10 : 7}
                  fill="#C59A2A"
                  stroke="#fff"
                  strokeWidth={2}
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                />
                {/* Tooltip */}
                {isActive && (
                  <g>
                    <rect
                      x={-220}
                      y={-80}
                      width={210}
                      height={90}
                      rx={10}
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))"
                    />
                    <text
                      x={-210}
                      y={-52}
                      fontSize={16}
                      fontWeight="bold"
                      fill="#C59A2A"
                    >
                      {airport.name}
                    </text>
                    <text
                      x={-210}
                      y={-28}
                      fontSize={14}
                      fill="#374151"
                    >
                      {airport.location}
                    </text>
                    <text
                      x={-210}
                      y={-6}
                      fontSize={13}
                      fill="#6b7280"
                    >
                      {airport.aircraft}
                    </text>
                  </g>
                )}
              </g>
            </Marker>
          )
        })}
      </ComposableMap>
      
      {/* Mobile instruction */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
        Tap a pin for details
      </div>
    </div>
  )
}
