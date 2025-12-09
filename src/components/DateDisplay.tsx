import { 
  SolarDate, 
  formatGregorianDate,
  getSolarDayName,
  SOLAR_MONTHS
} from '../utils/solarCalendar'
import './DateDisplay.css'

interface DateDisplayProps {
  solarDate: SolarDate
  gregorianDate: Date
  onGoToToday: () => void
}

export function DateDisplay({ solarDate, gregorianDate, onGoToToday }: DateDisplayProps) {
  const solarDayName = getSolarDayName(solarDate)
  
  return (
    <div className="date-display">
      <div className="date-card solar-date">
        <div className="date-label">
          <span className="label-icon">☀</span>
          Solar Calendar
        </div>
        
        {solarDate.isSolsticeDay ? (
          <div className="solstice-display">
            <div className="solstice-badge">
              <span className="solstice-icon">✦</span>
              Solstice Period
            </div>
            <div className="solstice-main">
              <span className="solstice-number">{solarDate.solsticeDay}</span>
              <span className="solstice-text">Solstice Day</span>
            </div>
            <div className="solstice-years">
              Year {solarDate.year} → {solarDate.year + 1}
            </div>
            {solarDate.solsticeDay === 3 && (
              <div className="summer-solstice-badge">
                <span>☀</span> Summer Solstice
              </div>
            )}
          </div>
        ) : (
          <div className="regular-display">
            {solarDayName && (
              <div className="day-name">{solarDayName}</div>
            )}
            <div className="date-main">
              <span className="date-day">{solarDate.day}</span>
              <div className="date-month-year">
                <span className="date-month">{SOLAR_MONTHS[solarDate.month - 1]}</span>
                <span className="date-year">Year {solarDate.year}</span>
              </div>
            </div>
          </div>
        )}
        
        {solarDate.isLeapYear && (
          <div className="leap-badge">Leap Year</div>
        )}
      </div>
      
      <div className="date-card gregorian-date">
        <div className="date-label">
          <span className="label-icon">📅</span>
          Gregorian Calendar
        </div>
        <div className="gregorian-main">
          {formatGregorianDate(gregorianDate)}
        </div>
      </div>
      
      <button className="today-button" onClick={onGoToToday}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Go to Today
      </button>
    </div>
  )
}

