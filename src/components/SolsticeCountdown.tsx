import { useState, useEffect } from 'react'
import { SolarDate } from '../utils/solarCalendar'
import './SolsticeCountdown.css'

interface SolsticeCountdownProps {
  currentSolarDate: SolarDate
}

interface AstronomicalEvent {
  name: string
  shortName: string
  date: Date
  icon: 'sun' | 'equinox'
  color: string
}

interface EventDistance {
  event: AstronomicalEvent
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
  isNow: boolean
}

// Get astronomical event dates for a given year
function getAstronomicalEvents(year: number): AstronomicalEvent[] {
  return [
    {
      name: 'Summer Solstice',
      shortName: 'Summer',
      date: new Date(year, 5, 21, 12, 0, 0), // June 21
      icon: 'sun',
      color: '#f59e0b'
    },
    {
      name: 'Fall Equinox',
      shortName: 'Fall',
      date: new Date(year, 8, 22, 12, 0, 0), // September 22
      icon: 'equinox',
      color: '#dc2626'
    },
    {
      name: 'Winter Solstice',
      shortName: 'Winter',
      date: new Date(year, 11, 21, 12, 0, 0), // December 21
      icon: 'sun',
      color: '#3b82f6'
    },
    {
      name: 'Spring Equinox',
      shortName: 'Spring',
      date: new Date(year, 2, 20, 12, 0, 0), // March 20
      icon: 'equinox',
      color: '#22c55e'
    }
  ]
}

function findNearestEvent(now: Date): EventDistance {
  const currentYear = now.getFullYear()
  
  // Get events for current year and next year
  const allEvents = [
    ...getAstronomicalEvents(currentYear - 1),
    ...getAstronomicalEvents(currentYear),
    ...getAstronomicalEvents(currentYear + 1)
  ]
  
  let nearestEvent: AstronomicalEvent | null = null
  let nearestDiff = Infinity
  let isPast = false
  
  for (const event of allEvents) {
    const diff = event.date.getTime() - now.getTime()
    const absDiff = Math.abs(diff)
    
    if (absDiff < Math.abs(nearestDiff)) {
      nearestDiff = diff
      nearestEvent = event
      isPast = diff < 0
    }
  }
  
  if (!nearestEvent) {
    // Fallback - shouldn't happen
    nearestEvent = allEvents[0]
    nearestDiff = nearestEvent.date.getTime() - now.getTime()
    isPast = nearestDiff < 0
  }
  
  const absDiff = Math.abs(nearestDiff)
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000)
  
  // Check if we're "at" the event (within 12 hours)
  const isNow = absDiff < 12 * 60 * 60 * 1000
  
  return {
    event: nearestEvent,
    days,
    hours,
    minutes,
    seconds,
    isPast,
    isNow
  }
}

export function SolsticeCountdown({ currentSolarDate }: SolsticeCountdownProps) {
  const [eventDistance, setEventDistance] = useState<EventDistance | null>(null)

  useEffect(() => {
    const updateDistance = () => {
      const now = new Date()
      setEventDistance(findNearestEvent(now))
    }

    updateDistance()
    const interval = setInterval(updateDistance, 1000)

    return () => clearInterval(interval)
  }, [currentSolarDate])

  if (!eventDistance) return null

  const { event, days, hours, minutes, seconds, isPast, isNow } = eventDistance

  // Show special display when we're at an event
  if (isNow) {
    return (
      <div className="solstice-countdown event-now" style={{ '--event-color': event.color } as React.CSSProperties}>
        <div className="countdown-glow"></div>
        <div className="countdown-content">
          <div className="event-burst">
            {event.icon === 'sun' ? (
              <svg viewBox="0 0 100 100" className="event-icon-large">
                <circle cx="50" cy="50" r="15" fill="currentColor"/>
                <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30) * Math.PI / 180
                    const x1 = 50 + Math.cos(angle) * 22
                    const y1 = 50 + Math.sin(angle) * 22
                    const x2 = 50 + Math.cos(angle) * 38
                    const y2 = 50 + Math.sin(angle) * 38
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
                  })}
                </g>
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="event-icon-large">
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="3"/>
                <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="3"/>
                <circle cx="50" cy="50" r="8" fill="currentColor"/>
              </svg>
            )}
          </div>
          <div className="event-now-text">
            <span className="now-label">{event.name}</span>
            <span className="now-highlight" style={{ color: event.color }}>Now!</span>
          </div>
          <div className="event-name">{event.name}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="solstice-countdown" style={{ '--event-color': event.color } as React.CSSProperties}>
      <div className="countdown-header">
        {event.icon === 'sun' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="countdown-icon">
            <circle cx="12" cy="12" r="4"/>
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
            </g>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="countdown-icon">
            <circle cx="12" cy="12" r="8"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
          </svg>
        )}
        <span className="event-label">
          {isPast ? 'Since' : 'Until'} <span className="event-name-inline" style={{ color: event.color }}>{event.name}</span>
        </span>
        <span className={`direction-badge ${isPast ? 'past' : 'future'}`}>
          {isPast ? 'ago' : 'ahead'}
        </span>
      </div>
      
      <div className="countdown-units">
        <div className="countdown-unit">
          <span className="unit-value">{days}</span>
          <span className="unit-label">days</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(hours).padStart(2, '0')}</span>
          <span className="unit-label">hrs</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(minutes).padStart(2, '0')}</span>
          <span className="unit-label">min</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(seconds).padStart(2, '0')}</span>
          <span className="unit-label">sec</span>
        </div>
      </div>

      <div className="event-full-name">{event.name}</div>
    </div>
  )
}
