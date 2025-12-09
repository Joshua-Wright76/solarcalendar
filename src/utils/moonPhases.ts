/**
 * Moon Phase Calculation Utilities
 * 
 * Uses a simplified lunar cycle calculation based on the synodic month
 * (average time between new moons ≈ 29.53059 days)
 */

export interface MoonPhase {
  phase: number  // 0-1 representing position in lunar cycle
  name: string
  emoji: string
  illumination: number  // 0-100 percentage
}

// Synodic month in days (new moon to new moon)
const SYNODIC_MONTH = 29.53059

// Known new moon date for reference (January 6, 2000 at 18:14 UTC)
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))

/**
 * Calculate the moon phase for a given date
 */
export function getMoonPhase(date: Date): MoonPhase {
  // Calculate days since known new moon
  const daysSinceNewMoon = (date.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24)
  
  // Get position in current lunar cycle (0-1)
  const lunarCycles = daysSinceNewMoon / SYNODIC_MONTH
  const phase = lunarCycles - Math.floor(lunarCycles)
  
  // Calculate illumination percentage
  // New moon = 0%, Full moon = 100%
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100)
  
  // Determine phase name and emoji
  const { name, emoji } = getPhaseNameAndEmoji(phase)
  
  return {
    phase,
    name,
    emoji,
    illumination
  }
}

/**
 * Get the phase name and emoji based on the phase position
 */
function getPhaseNameAndEmoji(phase: number): { name: string; emoji: string } {
  // 8 primary phases, each covering ~3.69 days
  if (phase < 0.0625) {
    return { name: 'New Moon', emoji: '🌑' }
  } else if (phase < 0.1875) {
    return { name: 'Waxing Crescent', emoji: '🌒' }
  } else if (phase < 0.3125) {
    return { name: 'First Quarter', emoji: '🌓' }
  } else if (phase < 0.4375) {
    return { name: 'Waxing Gibbous', emoji: '🌔' }
  } else if (phase < 0.5625) {
    return { name: 'Full Moon', emoji: '🌕' }
  } else if (phase < 0.6875) {
    return { name: 'Waning Gibbous', emoji: '🌖' }
  } else if (phase < 0.8125) {
    return { name: 'Last Quarter', emoji: '🌗' }
  } else if (phase < 0.9375) {
    return { name: 'Waning Crescent', emoji: '🌘' }
  } else {
    return { name: 'New Moon', emoji: '🌑' }
  }
}

/**
 * Get a simple moon phase icon (SVG path) for rendering
 * Returns the illumination fraction for the right side (0-1)
 */
export function getMoonPhaseIcon(phase: number): { 
  illuminatedSide: 'right' | 'left' | 'full' | 'none'
  illuminationFraction: number
} {
  if (phase < 0.03 || phase > 0.97) {
    return { illuminatedSide: 'none', illuminationFraction: 0 }
  } else if (phase < 0.47) {
    // Waxing: right side illuminated
    return { illuminatedSide: 'right', illuminationFraction: phase * 2 }
  } else if (phase < 0.53) {
    return { illuminatedSide: 'full', illuminationFraction: 1 }
  } else {
    // Waning: left side illuminated
    return { illuminatedSide: 'left', illuminationFraction: (1 - phase) * 2 }
  }
}

/**
 * Check if a date has a significant moon phase (new, first quarter, full, last quarter)
 */
export function isSignificantPhase(date: Date): boolean {
  const { phase } = getMoonPhase(date)
  
  // Check if we're within ~1 day of a significant phase
  const tolerance = 1 / SYNODIC_MONTH // ~1 day
  
  return (
    phase < tolerance || // New moon
    phase > 1 - tolerance || // New moon (wrapping)
    Math.abs(phase - 0.25) < tolerance || // First quarter
    Math.abs(phase - 0.5) < tolerance || // Full moon
    Math.abs(phase - 0.75) < tolerance // Last quarter
  )
}

