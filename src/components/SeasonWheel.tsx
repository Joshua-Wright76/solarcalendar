import { useMemo } from 'react'
import { SolarDate, daysInSolarYear } from '../utils/solarCalendar'
import './SeasonWheel.css'

interface SeasonWheelProps {
  currentSolarDate: SolarDate
}

interface Season {
  name: string
  startAngle: number
  endAngle: number
  color: string
  peakEvent: string
  peakAngle: number
}

// Seasons are centered on their astronomical events
// Summer Solstice is at the start of the Solar year (Solstice Day 3)
// Angles are measured clockwise from top (12 o'clock = 0°)
const SEASONS: Season[] = [
  {
    name: 'Summer',
    startAngle: 315,  // May 6 equivalent
    endAngle: 45,     // August 6 equivalent
    color: '#f59e0b',
    peakEvent: 'Summer Solstice',
    peakAngle: 0      // Top - Solstice Day 3
  },
  {
    name: 'Fall',
    startAngle: 45,
    endAngle: 135,
    color: '#dc2626',
    peakEvent: 'Fall Equinox',
    peakAngle: 90     // Right - around September 22
  },
  {
    name: 'Winter',
    startAngle: 135,
    endAngle: 225,
    color: '#3b82f6',
    peakEvent: 'Winter Solstice',
    peakAngle: 180    // Bottom - around December 21
  },
  {
    name: 'Spring',
    startAngle: 225,
    endAngle: 315,
    color: '#22c55e',
    peakEvent: 'Spring Equinox',
    peakAngle: 270    // Left - around March 20
  }
]

function getSeasonFromAngle(angle: number): Season {
  const normalizedAngle = ((angle % 360) + 360) % 360
  
  for (const season of SEASONS) {
    if (season.startAngle > season.endAngle) {
      // Season wraps around 0° (Summer)
      if (normalizedAngle >= season.startAngle || normalizedAngle < season.endAngle) {
        return season
      }
    } else {
      if (normalizedAngle >= season.startAngle && normalizedAngle < season.endAngle) {
        return season
      }
    }
  }
  
  return SEASONS[0] // Default to Summer
}

export function SeasonWheel({ currentSolarDate }: SeasonWheelProps) {
  const { currentAngle, currentSeason, progressInSeason } = useMemo(() => {
    // Calculate position in year (0-1)
    const totalDays = daysInSolarYear(currentSolarDate.year)
    const dayOfYear = currentSolarDate.dayOfYear
    
    // Convert to angle (0° = Summer Solstice at top, clockwise)
    // Solstice Day 3 (day 363) should be at 0°
    // We need to offset so day 363 maps to 0°
    const solsticeDayOfYear = 363
    const offsetProgress = (dayOfYear - solsticeDayOfYear + totalDays) % totalDays / totalDays
    const angle = offsetProgress * 360
    
    const season = getSeasonFromAngle(angle)
    
    // Calculate progress within the current season (0-1)
    let progressInSeason = 0
    const seasonSpan = season.startAngle > season.endAngle 
      ? (360 - season.startAngle + season.endAngle)
      : (season.endAngle - season.startAngle)
    
    if (season.startAngle > season.endAngle) {
      // Season wraps around
      if (angle >= season.startAngle) {
        progressInSeason = (angle - season.startAngle) / seasonSpan
      } else {
        progressInSeason = (360 - season.startAngle + angle) / seasonSpan
      }
    } else {
      progressInSeason = (angle - season.startAngle) / seasonSpan
    }
    
    return { currentAngle: angle, currentSeason: season, progressInSeason }
  }, [currentSolarDate])

  // SVG dimensions
  const size = 280
  const center = size / 2
  const outerRadius = 120
  const innerRadius = 60
  const markerRadius = 95

  // Create arc path for each season
  const createArcPath = (startAngle: number, endAngle: number, outer: number, inner: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    
    const x1 = center + Math.cos(startRad) * outer
    const y1 = center + Math.sin(startRad) * outer
    const x2 = center + Math.cos(endRad) * outer
    const y2 = center + Math.sin(endRad) * outer
    const x3 = center + Math.cos(endRad) * inner
    const y3 = center + Math.sin(endRad) * inner
    const x4 = center + Math.cos(startRad) * inner
    const y4 = center + Math.sin(startRad) * inner
    
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }

  // Calculate marker position
  const markerRad = (currentAngle - 90) * Math.PI / 180
  const markerX = center + Math.cos(markerRad) * markerRadius
  const markerY = center + Math.sin(markerRad) * markerRadius

  return (
    <div className="season-wheel">
      <div className="wheel-container">
        <svg viewBox={`0 0 ${size} ${size}`} className="wheel-svg">
          {/* Starfield background */}
          <defs>
            <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(15, 15, 20, 0.9)" />
              <stop offset="100%" stopColor="rgba(5, 5, 10, 1)" />
            </radialGradient>
            
            {/* Glow filters for each season */}
            {SEASONS.map(season => (
              <filter key={`glow-${season.name}`} id={`glow-${season.name}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={season.color} floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Background circle */}
          <circle cx={center} cy={center} r={outerRadius + 10} fill="url(#wheelBg)" />
          
          {/* Outer decorative ring */}
          <circle 
            cx={center} 
            cy={center} 
            r={outerRadius + 5} 
            fill="none" 
            stroke="rgba(245, 158, 11, 0.2)" 
            strokeWidth="1"
          />

          {/* Season arcs */}
          {SEASONS.map(season => {
            const isCurrent = season.name === currentSeason.name
            const endAngle = season.startAngle > season.endAngle 
              ? season.endAngle + 360 
              : season.endAngle
            
            return (
              <path
                key={season.name}
                d={createArcPath(season.startAngle, endAngle, outerRadius, innerRadius)}
                fill={season.color}
                opacity={isCurrent ? 0.9 : 0.3}
                filter={isCurrent ? `url(#glow-${season.name})` : undefined}
                className={`season-arc ${isCurrent ? 'current' : ''}`}
              />
            )
          })}

          {/* Inner circle */}
          <circle 
            cx={center} 
            cy={center} 
            r={innerRadius - 5} 
            fill="rgba(15, 15, 20, 0.95)"
            stroke="rgba(245, 158, 11, 0.3)"
            strokeWidth="1"
          />

          {/* Astronomical event markers */}
          {SEASONS.map(season => {
            const rad = (season.peakAngle - 90) * Math.PI / 180
            const x = center + Math.cos(rad) * (outerRadius + 15)
            const y = center + Math.sin(rad) * (outerRadius + 15)
            
            return (
              <g key={`marker-${season.name}`}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r="4" 
                  fill={season.color}
                  opacity="0.8"
                />
                <circle 
                  cx={x} 
                  cy={y} 
                  r="2" 
                  fill="white"
                />
              </g>
            )
          })}

          {/* Current position marker (sun) */}
          <g className="position-marker" transform={`translate(${markerX}, ${markerY})`}>
            <circle r="12" fill={currentSeason.color} opacity="0.3" className="marker-glow" />
            <circle r="8" fill={currentSeason.color} />
            <circle r="4" fill="#fff" opacity="0.9" />
            {/* Sun rays */}
            {[...Array(8)].map((_, i) => {
              const rayAngle = i * 45 * Math.PI / 180
              return (
                <line
                  key={i}
                  x1={Math.cos(rayAngle) * 10}
                  y1={Math.sin(rayAngle) * 10}
                  x2={Math.cos(rayAngle) * 14}
                  y2={Math.sin(rayAngle) * 14}
                  stroke={currentSeason.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              )
            })}
          </g>

          {/* Center label */}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            className="center-season-name"
            fill={currentSeason.color}
          >
            {currentSeason.name}
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            className="center-progress"
            fill="rgba(255,255,255,0.6)"
          >
            {Math.round(progressInSeason * 100)}%
          </text>
        </svg>
      </div>

      <div className="season-info">
        <div className="current-season-label">Current Season</div>
        <div className="current-season-name" style={{ color: currentSeason.color }}>
          {currentSeason.name}
        </div>
        <div className="season-peak">
          Peak: {currentSeason.peakEvent}
        </div>
        <div className="season-progress-bar">
          <div 
            className="season-progress-fill"
            style={{ 
              width: `${progressInSeason * 100}%`,
              background: currentSeason.color 
            }}
          />
        </div>
        <div className="season-progress-label">
          {Math.round(progressInSeason * 100)}% through {currentSeason.name.toLowerCase()}
        </div>
      </div>

      <div className="season-legend">
        {SEASONS.map(season => (
          <div 
            key={season.name} 
            className={`legend-item ${season.name === currentSeason.name ? 'current' : ''}`}
          >
            <span className="legend-dot" style={{ background: season.color }} />
            <span className="legend-name">{season.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

