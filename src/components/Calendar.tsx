import { 
  SolarDate, 
  SOLAR_MONTHS, 
  SOLAR_DAYS_ABBREV,
  getMonthDays,
  isSameSolarDay
} from '../utils/solarCalendar'
import './Calendar.css'

interface CalendarProps {
  month: number
  year: number
  currentSolarDate: SolarDate
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onShowSolstice: () => void
}

export function Calendar({
  month,
  year,
  currentSolarDate,
  onMonthChange,
  onYearChange,
  onShowSolstice
}: CalendarProps) {
  const days = getMonthDays(year, month)
  
  const handlePrevMonth = () => {
    if (month === 1) {
      onYearChange(year - 1)
      onMonthChange(12)
    } else {
      onMonthChange(month - 1)
    }
  }
  
  const handleNextMonth = () => {
    if (month === 12) {
      onShowSolstice()
    } else {
      onMonthChange(month + 1)
    }
  }
  
  const handleYearInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      onYearChange(value)
    }
  }

  const isCurrentMonth = 
    !currentSolarDate.isSolsticeDay && 
    currentSolarDate.month === month && 
    currentSolarDate.year === year

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button 
          className="nav-button" 
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div className="calendar-title">
          <select 
            className="month-select"
            value={month}
            onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
          >
            {SOLAR_MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
          <span className="year-label">Year</span>
          <input
            type="number"
            className="year-input"
            value={year}
            onChange={handleYearInput}
            aria-label="Year"
          />
        </div>
        
        <button 
          className="nav-button" 
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      
      {isCurrentMonth && (
        <div className="current-month-indicator">
          <span className="pulse-dot"></span>
          Current Month
        </div>
      )}
      
      <div className="calendar-grid">
        <div className="weekday-header">
          {SOLAR_DAYS_ABBREV.map(day => (
            <div key={day} className="weekday-cell">{day}</div>
          ))}
        </div>
        
        <div className="days-grid">
          {days.map(day => {
            const isToday = isSameSolarDay(day, currentSolarDate)
            return (
              <div 
                key={day.day}
                className={`day-cell ${isToday ? 'today' : ''}`}
              >
                <span className="day-number">{day.day}</span>
              </div>
            )
          })}
        </div>
      </div>
      
      <button className="solstice-link" onClick={onShowSolstice}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5"/>
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="4"/>
            <line x1="12" y1="20" x2="12" y2="23"/>
            <line x1="1" y1="12" x2="4" y2="12"/>
            <line x1="20" y1="12" x2="23" y2="12"/>
          </g>
        </svg>
        View Solstice Days
      </button>
    </div>
  )
}

