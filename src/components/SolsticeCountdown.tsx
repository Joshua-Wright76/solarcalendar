import { useState, useEffect } from 'react'
import { SolarDate, solarToGregorian } from '../utils/solarCalendar'
import './SolsticeCountdown.css'

interface SolsticeCountdownProps {
  currentSolarDate: SolarDate
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

export function SolsticeCountdown({ currentSolarDate }: SolsticeCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [isSolsticeNow, setIsSolsticeNow] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      
      // Check if we're currently in the Solstice period
      if (currentSolarDate.isSolsticeDay) {
        setIsSolsticeNow(true)
        setTimeRemaining(null)
        return
      }

      setIsSolsticeNow(false)

      // Calculate the start of the next Solstice period
      // Solstice Day 1 is day 361 of the year (after June 30)
      const nextSolsticeYear = currentSolarDate.year
      const solsticeStart = solarToGregorian({
        year: nextSolsticeYear,
        day: 1,
        isSolsticeDay: true
      })

      const diff = solsticeStart.getTime() - now.getTime()

      if (diff <= 0) {
        // We should be in solstice but currentSolarDate hasn't updated yet
        setIsSolsticeNow(true)
        setTimeRemaining(null)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds, total: diff })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [currentSolarDate])

  if (isSolsticeNow) {
    return (
      <div className="solstice-countdown solstice-now">
        <div className="countdown-glow"></div>
        <div className="countdown-content">
          <div className="sun-burst">
            <svg viewBox="0 0 100 100" className="sun-icon-large">
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
          </div>
          <div className="solstice-now-text">
            <span className="now-label">Solstice</span>
            <span className="now-highlight">Now!</span>
          </div>
          <div className="solstice-day-info">
            Day {currentSolarDate.solsticeDay} of {currentSolarDate.isLeapYear ? 6 : 5}
          </div>
        </div>
      </div>
    )
  }

  if (!timeRemaining) return null

  return (
    <div className="solstice-countdown">
      <div className="countdown-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="countdown-icon">
          <circle cx="12" cy="12" r="4"/>
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
          </g>
        </svg>
        <span>Until Solstice</span>
      </div>
      
      <div className="countdown-units">
        <div className="countdown-unit">
          <span className="unit-value">{timeRemaining.days}</span>
          <span className="unit-label">days</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
          <span className="unit-label">hrs</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
          <span className="unit-label">min</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="unit-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
          <span className="unit-label">sec</span>
        </div>
      </div>
    </div>
  )
}

