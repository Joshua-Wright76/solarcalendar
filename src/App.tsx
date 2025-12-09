import { useState, useEffect } from 'react'
import './App.css'
import { gregorianToSolar, SolarDate } from './utils/solarCalendar'
import { DateDisplay } from './components/DateDisplay'
import { Calendar } from './components/Calendar'
import { SolsticeDays } from './components/SolsticeDays'
import { DateConverter } from './components/DateConverter'
import { YearOverview } from './components/YearOverview'
import { SolsticeCountdown } from './components/SolsticeCountdown'
import { SeasonWheel } from './components/SeasonWheel'

type ViewMode = 'calendar' | 'solstice' | 'year'

function App() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [solarDate, setSolarDate] = useState<SolarDate>(gregorianToSolar(new Date()))
  const [viewMonth, setViewMonth] = useState(solarDate.month || 1)
  const [viewYear, setViewYear] = useState(solarDate.year)
  const [viewMode, setViewMode] = useState<ViewMode>(solarDate.isSolsticeDay ? 'solstice' : 'calendar')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentDate(now)
      setSolarDate(gregorianToSolar(now))
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const handleMonthChange = (month: number) => {
    setViewMonth(month)
    setViewMode('calendar')
  }

  const handleYearChange = (year: number) => {
    setViewYear(year)
  }

  const handleShowSolstice = () => {
    setViewMode('solstice')
  }

  const handleShowCalendar = () => {
    setViewMode('calendar')
  }

  const handleShowYearOverview = () => {
    setViewMode('year')
  }

  const goToToday = () => {
    const today = gregorianToSolar(new Date())
    setViewMonth(today.month || 1)
    setViewYear(today.year)
    setViewMode(today.isSolsticeDay ? 'solstice' : 'calendar')
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <svg className="sun-icon" viewBox="0 0 100 100" width="32" height="32">
              <circle cx="50" cy="50" r="20" fill="currentColor"/>
              <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="50" y1="5" x2="50" y2="20"/>
                <line x1="50" y1="80" x2="50" y2="95"/>
                <line x1="5" y1="50" x2="20" y2="50"/>
                <line x1="80" y1="50" x2="95" y2="50"/>
                <line x1="18" y1="18" x2="29" y2="29"/>
                <line x1="71" y1="71" x2="82" y2="82"/>
                <line x1="18" y1="82" x2="29" y2="71"/>
                <line x1="71" y1="29" x2="82" y2="18"/>
              </g>
            </svg>
            <h1>The Solar Calendar</h1>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="dashboard">
          <div className="dashboard-tile date-tile">
            <DateDisplay 
              solarDate={solarDate} 
              gregorianDate={currentDate} 
              onGoToToday={goToToday}
            />
          </div>

          <div className="dashboard-tile countdown-tile">
            <SolsticeCountdown currentSolarDate={solarDate} />
          </div>
          
          <div className="dashboard-tile calendar-tile">
            <div className="calendar-section">
              {viewMode === 'year' ? (
                <YearOverview
                  year={viewYear}
                  currentSolarDate={solarDate}
                  onMonthClick={handleMonthChange}
                  onShowSolstice={handleShowSolstice}
                  onBack={handleShowCalendar}
                />
              ) : viewMode === 'solstice' ? (
                <SolsticeDays 
                  year={viewYear} 
                  currentSolarDate={solarDate}
                  onShowCalendar={handleShowCalendar}
                />
              ) : (
                <Calendar 
                  month={viewMonth}
                  year={viewYear}
                  currentSolarDate={solarDate}
                  onMonthChange={handleMonthChange}
                  onYearChange={handleYearChange}
                  onShowSolstice={handleShowSolstice}
                  onShowYearOverview={handleShowYearOverview}
                />
              )}
            </div>
          </div>

          <div className="dashboard-tile season-tile">
            <SeasonWheel currentSolarDate={solarDate} />
          </div>

          <div className="dashboard-tile converter-tile">
            <DateConverter />
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>A perennial calendar system aligned with the Summer Solstice</p>
      </footer>
    </div>
  )
}

export default App
