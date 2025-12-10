/**
 * Solar Calendar Conversion Utilities
 * 
 * The Solar Calendar is a perennial calendar system with:
 * - Year 0 starting on June 24, 1999 (Gregorian)
 * - 12 months of exactly 30 days each (360 days)
 * - 5-6 Solstice Days between years (intercalary period)
 * - 6-day weeks (Monday, Wednesday, Thursday, Friday, Saturday, Sunday)
 * - Months: July, August, September, October, November, December, 
 *           January, February, March, April, May, June
 */

export interface SolarDate {
  year: number
  month: number  // 1-12 (1=July, 12=June)
  day: number    // 1-30 for regular months, 1-6 for Solstice Days
  dayOfWeek: number | null  // 0-5 (Mon, Wed, Thu, Fri, Sat, Sun) or null for Solstice Days
  dayOfYear: number  // 1-366
  isSolsticeDay: boolean
  solsticeDay?: number  // 1-6 if isSolsticeDay
  isLeapYear: boolean
}

export const SOLAR_MONTHS = [
  'July', 'August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June'
]

export const SOLAR_DAYS_OF_WEEK = [
  'Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

// Epoch: Solar Year 0 starts on June 24, 1999 (Gregorian)
const EPOCH_GREGORIAN = new Date(1999, 5, 24) // Month is 0-indexed

/**
 * Check if a Solar year is a leap year
 * Leap years are divisible by 4: 0, 4, 8, 12, etc.
 */
export function isSolarLeapYear(solarYear: number): boolean {
  const mod = ((solarYear % 4) + 4) % 4
  return mod === 0
}

/**
 * Get the number of days in a Solar year
 */
export function daysInSolarYear(solarYear: number): number {
  return isSolarLeapYear(solarYear) ? 366 : 365
}

/**
 * Convert a Gregorian date to a Solar date
 */
export function gregorianToSolar(gregorianDate: Date): SolarDate {
  const epochTime = EPOCH_GREGORIAN.getTime()
  const targetTime = new Date(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth(),
    gregorianDate.getDate()
  ).getTime()
  
  const daysSinceEpoch = Math.floor((targetTime - epochTime) / (1000 * 60 * 60 * 24))
  
  let year = 0
  let remainingDays = daysSinceEpoch
  
  if (daysSinceEpoch >= 0) {
    while (remainingDays >= daysInSolarYear(year)) {
      remainingDays -= daysInSolarYear(year)
      year++
    }
  } else {
    year = -1
    remainingDays = daysSinceEpoch
    while (remainingDays < 0) {
      remainingDays += daysInSolarYear(year)
      if (remainingDays < 0) {
        year--
      }
    }
  }
  
  const dayOfYear = remainingDays + 1
  const isLeapYear = isSolarLeapYear(year)
  
  // Check if we're in Solstice Days (days 361-365 or 361-366)
  if (dayOfYear > 360) {
    const solsticeDay = dayOfYear - 360
    return {
      year,
      month: 0,
      day: solsticeDay,
      dayOfWeek: null,
      dayOfYear,
      isSolsticeDay: true,
      solsticeDay,
      isLeapYear
    }
  }
  
  const month = Math.ceil(dayOfYear / 30)
  const day = ((dayOfYear - 1) % 30) + 1
  const dayOfWeek = (day - 1) % 6
  
  return {
    year,
    month,
    day,
    dayOfWeek,
    dayOfYear,
    isSolsticeDay: false,
    isLeapYear
  }
}

/**
 * Format a Solar date as a string
 */
export function formatSolarDate(solarDate: SolarDate): string {
  if (solarDate.isSolsticeDay) {
    const nextYear = solarDate.year + 1
    return `Solstice Day ${solarDate.solsticeDay}, Y${solarDate.year}–${nextYear}`
  }
  
  const monthName = SOLAR_MONTHS[solarDate.month - 1]
  return `${monthName} ${solarDate.day}, Year ${solarDate.year}`
}

/**
 * Get the day of week name for a Solar date
 */
export function getSolarDayName(solarDate: SolarDate): string | null {
  if (solarDate.dayOfWeek === null) {
    return null
  }
  return SOLAR_DAYS_OF_WEEK[solarDate.dayOfWeek]
}

/**
 * Format a Gregorian date as a string
 */
export function formatGregorianDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
