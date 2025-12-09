import {
  SolarDate,
  SOLAR_MONTHS,
  getMonthDays,
  isSameSolarDay,
  isSolarLeapYear
} from '../utils/solarCalendar'
import './YearOverview.css'

interface YearOverviewProps {
  year: number
  currentSolarDate: SolarDate
  onMonthClick: (month: number) => void
  onShowSolstice: () => void
  onBack: () => void
}

export function YearOverview({
  year,
  currentSolarDate,
  onMonthClick,
  onShowSolstice,
  onBack
}: YearOverviewProps) {
  const isLeapYear = isSolarLeapYear(year)
  const solsticeDayCount = isLeapYear ? 6 : 5

  const isCurrentYear = currentSolarDate.year === year
  const isPastMonth = (month: number) => {
    if (!isCurrentYear) return currentSolarDate.year > year
    if (currentSolarDate.isSolsticeDay) return true
    return month < currentSolarDate.month
  }

  return (
    <div className="year-overview">
      <div className="year-header">
        <button className="back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Month
        </button>
        <h2 className="year-title">Year {year}</h2>
        {isLeapYear && <span className="leap-badge-small">Leap Year</span>}
      </div>

      <div className="months-grid">
        {SOLAR_MONTHS.map((monthName, index) => {
          const month = index + 1
          const days = getMonthDays(year, month)
          const isCurrentMonth = isCurrentYear && !currentSolarDate.isSolsticeDay && currentSolarDate.month === month
          const isPast = isPastMonth(month)

          return (
            <div
              key={monthName}
              className={`mini-month ${isCurrentMonth ? 'current' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => onMonthClick(month)}
            >
              <div className="mini-month-header">{monthName}</div>
              <div className="mini-days-grid">
                {days.map(day => {
                  const isToday = isSameSolarDay(day, currentSolarDate)
                  return (
                    <div
                      key={day.day}
                      className={`mini-day ${isToday ? 'today' : ''}`}
                    >
                      {day.day}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div 
        className={`solstice-period ${isCurrentYear && currentSolarDate.isSolsticeDay ? 'current' : ''}`}
        onClick={onShowSolstice}
      >
        <div className="solstice-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5"/>
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="4"/>
              <line x1="12" y1="20" x2="12" y2="23"/>
              <line x1="1" y1="12" x2="4" y2="12"/>
              <line x1="20" y1="12" x2="23" y2="12"/>
            </g>
          </svg>
          <span>Solstice Days</span>
          <span className="solstice-count">{solsticeDayCount} days</span>
        </div>
        <div className="solstice-days-mini">
          {Array.from({ length: solsticeDayCount }, (_, i) => {
            const isToday = currentSolarDate.isSolsticeDay && 
                           currentSolarDate.year === year && 
                           currentSolarDate.solsticeDay === i + 1
            return (
              <div key={i} className={`solstice-day-dot ${isToday ? 'today' : ''} ${i === 2 ? 'peak' : ''}`}>
                {i + 1}
              </div>
            )
          })}
        </div>
        <div className="solstice-label">Y{year}–{year + 1}</div>
      </div>
    </div>
  )
}

