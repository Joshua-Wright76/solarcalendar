import { 
  SolarDate, 
  getSolsticeDays,
  isSameSolarDay,
  isSolarLeapYear
} from '../utils/solarCalendar'
import './SolsticeDays.css'

interface SolsticeDaysProps {
  year: number
  currentSolarDate: SolarDate
  onShowCalendar: () => void
}

const SOLSTICE_LABELS = [
  { day: 1, label: 'Preparation Day', description: 'The week pauses as we prepare for the solstice' },
  { day: 2, label: 'Preparation Day', description: 'Final preparations before the celestial event' },
  { day: 3, label: 'Summer Solstice', description: 'The longest day of the year', special: true },
  { day: 4, label: 'Post-Solstice', description: 'Reflection on the turning of the sun' },
  { day: 5, label: 'Post-Solstice', description: 'The bridge between years' },
  { day: 6, label: 'Leap Day', description: 'An extra day for leap years', leapOnly: true },
]

export function SolsticeDays({ year, currentSolarDate, onShowCalendar }: SolsticeDaysProps) {
  const days = getSolsticeDays(year)
  const isLeap = isSolarLeapYear(year)
  const nextYear = year + 1
  
  const isCurrentSolsticePeriod = 
    currentSolarDate.isSolsticeDay && currentSolarDate.year === year

  return (
    <div className="solstice-days">
      <div className="solstice-header">
        <button className="back-button" onClick={onShowCalendar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Calendar
        </button>
        
        <div className="solstice-title">
          <h2>Solstice Days</h2>
          <span className="year-range">Year {year} → Year {nextYear}</span>
        </div>
        
        {isLeap && (
          <div className="leap-indicator">
            <span className="leap-dot"></span>
            6 Days (Leap)
          </div>
        )}
      </div>
      
      {isCurrentSolsticePeriod && (
        <div className="current-period-banner">
          <span className="banner-icon">✦</span>
          You are currently in the Solstice Period
        </div>
      )}
      
      <div className="solstice-info">
        <p>
          The Solstice Days exist outside the regular calendar. 
          They have no weekday—the weekly cycle pauses during this sacred interval 
          between years.
        </p>
      </div>
      
      <div className="solstice-list">
        {days.map(day => {
          const info = SOLSTICE_LABELS[day.solsticeDay! - 1]
          const isToday = isSameSolarDay(day, currentSolarDate)
          
          return (
            <div 
              key={day.solsticeDay}
              className={`solstice-item ${info.special ? 'special' : ''} ${isToday ? 'today' : ''}`}
            >
              <div className="solstice-day-number">
                <span>{day.solsticeDay}</span>
              </div>
              <div className="solstice-day-info">
                <div className="solstice-day-label">
                  {info.label}
                  {isToday && <span className="today-badge">Today</span>}
                </div>
                <div className="solstice-day-desc">{info.description}</div>
              </div>
              {info.special && (
                <div className="sun-symbol">
                  <svg viewBox="0 0 100 100" width="40" height="40">
                    <circle cx="50" cy="50" r="15" fill="currentColor"/>
                    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="50" y1="10" x2="50" y2="25"/>
                      <line x1="50" y1="75" x2="50" y2="90"/>
                      <line x1="10" y1="50" x2="25" y2="50"/>
                      <line x1="75" y1="50" x2="90" y2="50"/>
                      <line x1="22" y1="22" x2="32" y2="32"/>
                      <line x1="68" y1="68" x2="78" y2="78"/>
                      <line x1="22" y1="78" x2="32" y2="68"/>
                      <line x1="68" y1="32" x2="78" y2="22"/>
                    </g>
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="solstice-nav">
        <button 
          className="nav-to-june"
          onClick={onShowCalendar}
        >
          ← June, Year {year}
        </button>
        <button 
          className="nav-to-july"
          onClick={onShowCalendar}
        >
          July, Year {nextYear} →
        </button>
      </div>
    </div>
  )
}

