import { useState, useEffect } from 'react'
import {
  gregorianToSolar,
  solarToGregorian,
  formatSolarDate,
  formatGregorianDate,
  SOLAR_MONTHS,
  SolarDate,
  isSolarLeapYear
} from '../utils/solarCalendar'
import './DateConverter.css'

export function DateConverter() {
  const [mode, setMode] = useState<'gregorian-to-solar' | 'solar-to-gregorian'>('gregorian-to-solar')
  
  // Gregorian input state
  const [gregorianInput, setGregorianInput] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  
  // Solar input state
  const [solarYear, setSolarYear] = useState(0)
  const [solarMonth, setSolarMonth] = useState(1)
  const [solarDay, setSolarDay] = useState(1)
  const [isSolsticeInput, setIsSolsticeInput] = useState(false)
  
  // Results
  const [result, setResult] = useState<{ solar: SolarDate; gregorian: Date } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (mode === 'gregorian-to-solar') {
      const date = new Date(gregorianInput + 'T12:00:00')
      if (!isNaN(date.getTime())) {
        const solar = gregorianToSolar(date)
        setResult({ solar, gregorian: date })
      }
    } else {
      const gregorian = solarToGregorian({
        year: solarYear,
        month: isSolsticeInput ? 0 : solarMonth,
        day: solarDay,
        isSolsticeDay: isSolsticeInput
      })
      const solar = gregorianToSolar(gregorian)
      setResult({ solar, gregorian })
    }
  }, [mode, gregorianInput, solarYear, solarMonth, solarDay, isSolsticeInput])

  const handleCopy = () => {
    if (!result) return
    const text = mode === 'gregorian-to-solar'
      ? formatSolarDate(result.solar)
      : formatGregorianDate(result.gregorian)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maxSolsticeDays = isSolarLeapYear(solarYear) ? 6 : 5

  return (
    <div className="date-converter">
      <div className="converter-header">
        <h3>Date Converter</h3>
        <div className="mode-toggle">
          <button
            className={mode === 'gregorian-to-solar' ? 'active' : ''}
            onClick={() => setMode('gregorian-to-solar')}
          >
            Gregorian → Solar
          </button>
          <button
            className={mode === 'solar-to-gregorian' ? 'active' : ''}
            onClick={() => setMode('solar-to-gregorian')}
          >
            Solar → Gregorian
          </button>
        </div>
      </div>

      <div className="converter-body">
        {mode === 'gregorian-to-solar' ? (
          <div className="input-section">
            <label className="input-label">Enter Gregorian Date</label>
            <input
              type="date"
              className="date-input"
              value={gregorianInput}
              onChange={(e) => setGregorianInput(e.target.value)}
            />
          </div>
        ) : (
          <div className="input-section solar-inputs">
            <label className="input-label">Enter Solar Date</label>
            
            <div className="solstice-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isSolsticeInput}
                  onChange={(e) => {
                    setIsSolsticeInput(e.target.checked)
                    if (e.target.checked) {
                      setSolarDay(Math.min(solarDay, maxSolsticeDays))
                    }
                  }}
                />
                <span>Solstice Day</span>
              </label>
            </div>

            <div className="solar-input-grid">
              {!isSolsticeInput && (
                <div className="input-group">
                  <label>Month</label>
                  <select
                    value={solarMonth}
                    onChange={(e) => setSolarMonth(parseInt(e.target.value))}
                  >
                    {SOLAR_MONTHS.map((name, i) => (
                      <option key={name} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="input-group">
                <label>{isSolsticeInput ? 'Solstice Day' : 'Day'}</label>
                <input
                  type="number"
                  min={1}
                  max={isSolsticeInput ? maxSolsticeDays : 30}
                  value={solarDay}
                  onChange={(e) => setSolarDay(Math.max(1, Math.min(
                    parseInt(e.target.value) || 1,
                    isSolsticeInput ? maxSolsticeDays : 30
                  )))}
                />
              </div>
              
              <div className="input-group">
                <label>Year</label>
                <input
                  type="number"
                  value={solarYear}
                  onChange={(e) => setSolarYear(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="result-section">
            <div className="result-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
            
            <div className="result-card">
              <div className="result-label">
                {mode === 'gregorian-to-solar' ? 'Solar Date' : 'Gregorian Date'}
              </div>
              <div className="result-value">
                {mode === 'gregorian-to-solar'
                  ? formatSolarDate(result.solar)
                  : formatGregorianDate(result.gregorian)
                }
              </div>
              <button className="copy-button" onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

