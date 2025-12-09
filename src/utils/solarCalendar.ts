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

export const SOLAR_DAYS_ABBREV = ['Mon', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Epoch: Solar Year 0 starts on June 24, 1999 (Gregorian)
const EPOCH_GREGORIAN = new Date(1999, 5, 24) // Month is 0-indexed

/**
 * Check if a Solar year is a leap year
 * Leap years are divisible by 4: 0, 4, 8, 12, etc.
 */
export function isSolarLeapYear(solarYear: number): boolean {
  // For negative years, we need to handle the modulo correctly
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
 * Get the number of Solstice Days for a given year transition
 */
export function solsticeDaysCount(solarYear: number): number {
  // Solstice days belong to the transition between years
  // Year Y's solstice days come after June 30 of year Y
  return isSolarLeapYear(solarYear) ? 6 : 5
}

/**
 * Convert a Gregorian date to a Solar date
 */
export function gregorianToSolar(gregorianDate: Date): SolarDate {
  // Calculate days since epoch (June 24, 1999)
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
    // Forward from epoch
    while (remainingDays >= daysInSolarYear(year)) {
      remainingDays -= daysInSolarYear(year)
      year++
    }
  } else {
    // Backward from epoch
    year = -1
    remainingDays = daysSinceEpoch
    while (remainingDays < 0) {
      remainingDays += daysInSolarYear(year)
      if (remainingDays < 0) {
        year--
      }
    }
  }
  
  // remainingDays is now the 0-indexed day of the year (0-364 or 0-365)
  const dayOfYear = remainingDays + 1 // Convert to 1-indexed
  
  const isLeapYear = isSolarLeapYear(year)
  
  // Check if we're in Solstice Days (days 361-365 or 361-366)
  if (dayOfYear > 360) {
    const solsticeDay = dayOfYear - 360
    return {
      year,
      month: 0, // Special value for Solstice period
      day: solsticeDay,
      dayOfWeek: null, // No weekday during Solstice Days
      dayOfYear,
      isSolsticeDay: true,
      solsticeDay,
      isLeapYear
    }
  }
  
  // Regular month calculation
  const month = Math.ceil(dayOfYear / 30) // 1-12
  const day = ((dayOfYear - 1) % 30) + 1 // 1-30
  const dayOfWeek = (day - 1) % 6 // 0-5 (Mon, Wed, Thu, Fri, Sat, Sun)
  
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
 * Convert a Solar date to a Gregorian date
 */
export function solarToGregorian(solarDate: {
  year: number
  month?: number
  day: number
  isSolsticeDay?: boolean
}): Date {
  let totalDays = 0
  
  // Count days from epoch to start of target year
  if (solarDate.year >= 0) {
    for (let y = 0; y < solarDate.year; y++) {
      totalDays += daysInSolarYear(y)
    }
  } else {
    for (let y = -1; y >= solarDate.year; y--) {
      totalDays -= daysInSolarYear(y)
    }
  }
  
  // Add days within the year
  if (solarDate.isSolsticeDay) {
    totalDays += 360 + solarDate.day
  } else {
    const dayOfYear = ((solarDate.month || 1) - 1) * 30 + solarDate.day
    totalDays += dayOfYear
  }
  
  // Subtract 1 because day 1 is the epoch day itself
  totalDays -= 1
  
  const result = new Date(EPOCH_GREGORIAN)
  result.setDate(result.getDate() + totalDays)
  
  return result
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
 * Get all days in a given Solar month
 */
export function getMonthDays(year: number, month: number): SolarDate[] {
  const days: SolarDate[] = []
  const isLeapYear = isSolarLeapYear(year)
  
  for (let day = 1; day <= 30; day++) {
    const dayOfYear = (month - 1) * 30 + day
    const dayOfWeek = (day - 1) % 6
    
    days.push({
      year,
      month,
      day,
      dayOfWeek,
      dayOfYear,
      isSolsticeDay: false,
      isLeapYear
    })
  }
  
  return days
}

/**
 * Get all Solstice Days for a given year
 */
export function getSolsticeDays(year: number): SolarDate[] {
  const isLeapYear = isSolarLeapYear(year)
  const count = isLeapYear ? 6 : 5
  const days: SolarDate[] = []
  
  for (let i = 1; i <= count; i++) {
    days.push({
      year,
      month: 0,
      day: i,
      dayOfWeek: null,
      dayOfYear: 360 + i,
      isSolsticeDay: true,
      solsticeDay: i,
      isLeapYear
    })
  }
  
  return days
}

/**
 * Check if two Solar dates are the same day
 */
export function isSameSolarDay(a: SolarDate, b: SolarDate): boolean {
  if (a.isSolsticeDay !== b.isSolsticeDay) return false
  if (a.year !== b.year) return false
  
  if (a.isSolsticeDay) {
    return a.solsticeDay === b.solsticeDay
  }
  
  return a.month === b.month && a.day === b.day
}

