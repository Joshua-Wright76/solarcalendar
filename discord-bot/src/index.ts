import { 
  Client, 
  EmbedBuilder, 
  GatewayIntentBits, 
  TextChannel,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js'
import cron from 'node-cron'
import 'dotenv/config'
import {
  gregorianToSolar,
  formatSolarDate,
  formatGregorianDate,
  getSolarDayName,
  SolarDate,
  SOLAR_MONTHS,
  SOLAR_DAYS_OF_WEEK
} from './solarCalendar.js'
import {
  getServerSettings,
  setDailyChannel,
  removeDailyChannel,
  setTimezone,
  getAllConfiguredGuilds,
  setBirthday,
  removeBirthday,
  getGuildBirthdays,
  getBirthdaysOnDate,
  getBirthdaysOnDay,
  getUserBirthday,
  type Birthday,
  type ServerSettings
} from './database.js'

// Moon phase calculation (synodic month ≈ 29.53 days)
const SYNODIC_MONTH = 29.53059
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))

function getMoonPhaseEmoji(date: Date): string {
  const daysSinceNewMoon = (date.getTime() - KNOWN_NEW_MOON.getTime()) / (1000 * 60 * 60 * 24)
  const phase = (daysSinceNewMoon / SYNODIC_MONTH) % 1
  
  if (phase < 0.0625 || phase >= 0.9375) return '🌑'
  if (phase < 0.1875) return '🌒'
  if (phase < 0.3125) return '🌓'
  if (phase < 0.4375) return '🌔'
  if (phase < 0.5625) return '🌕'
  if (phase < 0.6875) return '🌖'
  if (phase < 0.8125) return '🌗'
  return '🌘'
}

/**
 * Build a visual progress bar
 */
function buildProgressBar(current: number, total: number, length: number = 15): string {
  const percentage = Math.round((current / total) * 100)
  const filled = Math.round((current / total) * length)
  const empty = length - filled
  return `${'▓'.repeat(filled)}${'░'.repeat(empty)} ${percentage}% (Day ${current})`
}

// Configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://solar-calendar.com'
const DEFAULT_CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *'
const DEFAULT_TIMEZONE = process.env.TIMEZONE || 'America/New_York'

if (!BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is required in .env')
  process.exit(1)
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('today')
    .setDescription('Show today\'s date in the Solar Calendar'),
  
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the channel for daily solar calendar messages')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to send daily messages to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Stop sending daily solar calendar messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  new SlashCommandBuilder()
    .setName('addbirthday')
    .setDescription('Add your birthday to the solar calendar')
    .addIntegerOption(option =>
      option
        .setName('month')
        .setDescription('Solar month (1=July, 2=August, ... 12=June)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12)
    )
    .addIntegerOption(option =>
      option
        .setName('day')
        .setDescription('Solar day (1-30)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(30)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to add birthday for (admin only, defaults to yourself)')
        .setRequired(false)
    ),
  
  new SlashCommandBuilder()
    .setName('removebirthday')
    .setDescription('Remove a birthday from the solar calendar')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove birthday for (admin only, defaults to yourself)')
        .setRequired(false)
    ),
  
  new SlashCommandBuilder()
    .setName('listbirthdays')
    .setDescription('List all birthdays in this server'),
  
  new SlashCommandBuilder()
    .setName('mybirthday')
    .setDescription('Show your birthday in the solar calendar'),
  
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View current server settings for the solar calendar bot')
].map(cmd => cmd.toJSON())

/**
 * Get a date offset by a number of days
 */
function getDateOffset(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Format a short solar date (e.g., "Sep 18" or "Sol 3")
 */
function formatShortSolarDate(solarDate: SolarDate): string {
  if (solarDate.isSolsticeDay) {
    return `Sol ${solarDate.solsticeDay}`
  }
  const monthAbbrev = SOLAR_MONTHS[solarDate.month - 1].substring(0, 3)
  return `${monthAbbrev} ${solarDate.day}`
}

/**
 * Format a short Gregorian date (e.g., "Dec 10")
 */
function formatShortGregorianDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get the solar day abbreviation (e.g., "Mon", "Wed")
 */
function getSolarDayAbbrev(solarDate: SolarDate): string {
  if (solarDate.dayOfWeek === null) {
    return '✨'  // Solstice days
  }
  return SOLAR_DAYS_OF_WEEK[solarDate.dayOfWeek].substring(0, 3)
}

/**
 * Get the Gregorian day abbreviation (e.g., "Mon", "Tue")
 */
function getGregorianDayAbbrev(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Build the 7-day view string (compact single line: 17 18 19 [20] 21 22 23)
 */
function build7DayView(today: Date): string {
  const days: string[] = []
  
  for (let offset = -3; offset <= 3; offset++) {
    const date = getDateOffset(today, offset)
    const solarDate = gregorianToSolar(date)
    const dayNum = solarDate.isSolsticeDay ? `S${solarDate.solsticeDay}` : String(solarDate.day)
    
    if (offset === 0) {
      days.push(`**[${dayNum}]**`)
    } else {
      days.push(dayNum)
    }
  }
  
  return days.join(' ')
}

/**
 * Build the current solar week view
 */
function buildSolarWeekView(today: Date): string {
  const solarToday = gregorianToSolar(today)
  
  // Solstice days don't have weeks
  if (solarToday.isSolsticeDay) {
    return '✨ _Solstice Days - outside regular weeks_'
  }
  
  // Solar weeks are 6 days: days 1-6, 7-12, 13-18, 19-24, 25-30 of each month
  // dayOfWeek is 0-5, so we need to find the start of the current week
  const dayInMonth = solarToday.day
  const weekStartDay = dayInMonth - solarToday.dayOfWeek! // Day 1, 7, 13, 19, or 25
  
  const weekDays: string[] = []
  for (let i = 0; i < 6; i++) {
    const day = weekStartDay + i
    const isToday = day === dayInMonth
    const dayName = SOLAR_DAYS_OF_WEEK[i].substring(0, 3)
    const highlight = isToday ? '**' : ''
    const marker = isToday ? '•' : ' '
    weekDays.push(`${marker}${highlight}${dayName} ${day}${highlight}`)
  }
  
  return weekDays.join(' ')
}

/**
 * Build the current Gregorian week view (Sunday to Saturday)
 */
function buildGregorianWeekView(today: Date): string {
  // Get the start of the week (Sunday)
  const startOfWeek = new Date(today)
  const dayOfWeek = today.getDay() // 0 = Sunday
  startOfWeek.setDate(today.getDate() - dayOfWeek)
  
  const weekDays: string[] = []
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  for (let i = 0; i < 7; i++) {
    const date = getDateOffset(startOfWeek, i)
    const isToday = date.toDateString() === today.toDateString()
    const dayNum = date.getDate()
    const highlight = isToday ? '**' : ''
    const marker = isToday ? '•' : ' '
    weekDays.push(`${marker}${highlight}${dayNames[i]} ${dayNum}${highlight}`)
  }
  
  return weekDays.join(' ')
}

/**
 * Get the current solar season name (24 seasons, 2 per month)
 */
function getSolarSeason(solarDate: SolarDate): string {
  if (solarDate.isSolsticeDay) {
    return '🌞✨ Solstice Celebration ✨🌞'
  }

  const month = SOLAR_MONTHS[solarDate.month - 1]
  const day = solarDate.day
  
  switch (month) {
    case 'July':
      return day <= 15 ? '💥🌞 Summer Bursting 🌞💥' : '🌴🌞 Summer in Repose 🌞🌴'
    case 'August':
      return day <= 15 ? '💤🌞 Summer Sleeping 🌞💤' : '👂🍁 Autumn Calling 🍁👂'
    case 'September':
      return day <= 15 ? '🍃🍁 Autumn in Flight 🍁🍃' : '🕸️🍁 Autumn in Vain 🍁🕸️'
    case 'October':
      return day <= 15 ? '⚡️🍁 Autumn Falling 🍁⚡️' : '🌚🍁 Autumn in Mourning 🍁🌚'
    case 'November':
      return day <= 15 ? '🌈🍁 Autumn in Memory 🍁🌈' : '👁️❄️ Winter Awake ❄️👁️'
    case 'December':
      return day <= 15 ? '🏔️❄️ Winter Alone ❄️🏔️' : '🎶❄️ Winter Harmonic ❄️🎶'
    case 'January':
      return day <= 15 ? '🎊❄️ Winter in Chorus ❄️🎊' : '🥀❄️ Winter in Reprise ❄️🥀'
    case 'February':
      return day <= 15 ? '⭐️❄️ Winter All-Aglow ❄️⭐️' : '🌱🌼 Spring in Quiet 🌼🌱'
    case 'March':
      return day <= 15 ? '🐝🌼 Spring Bittersweet 🌼🐝' : '🌿🌼 Spring in Bloom 🌼🌿'
    case 'April':
      return day <= 15 ? '💐🌼 Spring Overflowing 🌼💐' : '🕊️🌼 Spring Coming Home 🌼🕊️'
    case 'May':
      return day <= 15 ? '🚪🌼 Spring At-the-Door 🌼🚪' : '👁️🌞 Summer Waking 🌞👁️'
    case 'June':
      return day <= 15 ? '🎶🌞 Summer Singing 🌞🎶' : '🎺🌞 Summer in Glory 🌞🎺'
    default:
      return ''
  }
}

/**
 * Get birthdays on a specific solar day (annual birthday) for a guild
 */
function getGuildBirthdaysOnDate(guildId: string, month: number, day: number): Birthday[] {
  return getBirthdaysOnDate(guildId, month, day)
}

/**
 * Get monthly birthdays on a specific day (people whose birthday falls on this day number,
 * but NOT in the current month - to avoid duplicating annual birthdays)
 */
function getMonthlyBirthdaysOnDayForGuild(guildId: string, month: number, day: number): Birthday[] {
  const allOnDay = getBirthdaysOnDay(guildId, day)
  return allOnDay.filter(b => b.month !== month)
}

/**
 * Get monthly birthdays in a range around today (last N days and next N days)
 */
function getMonthlyBirthdaysInRange(guildId: string, solarDate: SolarDate, daysBefore: number = 3, daysAfter: number = 3): { 
  offset: number, 
  day: number, 
  names: string[] 
}[] {
  if (solarDate.isSolsticeDay) return []
  
  const results: { offset: number, day: number, names: string[] }[] = []
  
  // Check days before and after (including today at offset 0)
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    let checkDay = solarDate.day + offset
    let checkMonth = solarDate.month
    
    // Handle month boundaries
    if (checkDay < 1) {
      checkDay += 30
      checkMonth--
      if (checkMonth < 1) checkMonth = 12
    } else if (checkDay > 30) {
      checkDay -= 30
      checkMonth++
      if (checkMonth > 12) checkMonth = 1
    }
    
    const monthlyBdays = getMonthlyBirthdaysOnDayForGuild(guildId, checkMonth, checkDay)
    if (monthlyBdays.length > 0) {
      results.push({
        offset,
        day: checkDay,
        names: monthlyBdays.map(b => b.user_name)
      })
    }
  }
  
  return results
}

/**
 * Get upcoming birthdays for the next N days for a guild
 */
function getUpcomingBirthdays(guildId: string, solarDate: SolarDate, daysAhead: number = 7): { day: number, month: number, names: string[] }[] {
  if (solarDate.isSolsticeDay) return []
  
  const upcoming: { day: number, month: number, names: string[] }[] = []
  let currentMonth = solarDate.month
  let currentDay = solarDate.day
  
  for (let i = 1; i <= daysAhead; i++) {
    currentDay++
    if (currentDay > 30) {
      currentDay = 1
      currentMonth++
      if (currentMonth > 12) {
        currentMonth = 1
      }
    }
    
    const bdays = getGuildBirthdaysOnDate(guildId, currentMonth, currentDay)
    if (bdays.length > 0) {
      upcoming.push({
        day: currentDay,
        month: currentMonth,
        names: bdays.map(b => b.user_name)
      })
    }
  }
  
  return upcoming
}

/**
 * Format offset as compact symbol
 */
function formatOffsetSymbol(offset: number): string {
  if (offset === 0) return ''
  if (offset < 0) return `₋${Math.abs(offset)}`
  return `₊${offset}`
}

/**
 * Build the birthday display string (compact symbolic format)
 */
function buildBirthdayString(guildId: string, solarDate: SolarDate): string | null {
  if (solarDate.isSolsticeDay) return null
  
  const todayBirthdays = getGuildBirthdaysOnDate(guildId, solarDate.month, solarDate.day)
  const upcoming = getUpcomingBirthdays(guildId, solarDate, 7)
  const monthlyBirthdays = getMonthlyBirthdaysInRange(guildId, solarDate, 3, 3)
  
  if (todayBirthdays.length === 0 && upcoming.length === 0 && monthlyBirthdays.length === 0) {
    return null
  }
  
  const parts: string[] = []
  
  // Today's annual birthdays: 🎂 name
  if (todayBirthdays.length > 0) {
    parts.push(`🎂 **${todayBirthdays.map(b => b.user_name).join(', ')}**`)
  }
  
  // Upcoming annual birthdays: 🎈 name (day)
  if (upcoming.length > 0) {
    const upcomingStr = upcoming.map(u => 
      `${u.names.join(', ')}₊${u.day - solarDate.day > 0 ? u.day - solarDate.day : u.day + 30 - solarDate.day}`
    ).join(' ')
    parts.push(`🎈 ${upcomingStr}`)
  }
  
  // Monthly birthdays: 🧁 name (with offset)
  if (monthlyBirthdays.length > 0) {
    const monthlyStr = monthlyBirthdays
      .sort((a, b) => a.offset - b.offset)
      .map(m => `${m.names.join(', ')}${formatOffsetSymbol(m.offset)}`)
      .join(' ')
    parts.push(`🧁 ${monthlyStr}`)
  }
  
  return parts.join('  ')
}

/**
 * Get a seasonal emoji based on the solar month
 */
function getSeasonEmoji(solarDate: SolarDate): string {
  if (solarDate.isSolsticeDay) {
    return '🌞' // Summer solstice celebration
  }
  
  // Months 1-3: July, August, September (Summer)
  // Months 4-6: October, November, December (Fall)
  // Months 7-9: January, February, March (Winter)
  // Months 10-12: April, May, June (Spring)
  if (solarDate.month <= 3) return '☀️'
  if (solarDate.month <= 6) return '🍂'
  if (solarDate.month <= 9) return '❄️'
  return '🌸'
}

/**
 * Get season progress info: days into season, total days, and days to nearest marker
 * Seasons: Summer (months 1-3), Fall (4-6), Winter (7-9), Spring (10-12)
 * Markers: Summer Solstice (solstice days), Fall Equinox (month 4), Winter Solstice (month 7), Spring Equinox (month 10)
 */
function getSeasonProgress(solarDate: SolarDate): {
  daysIntoSeason: number
  seasonLength: number
  nearestMarker: string
  daysToMarker: number
  isPast: boolean
} {
  const SEASON_LENGTH = 90 // 3 months × 30 days
  
  if (solarDate.isSolsticeDay) {
    return {
      daysIntoSeason: 0,
      seasonLength: SEASON_LENGTH,
      nearestMarker: 'Summer Solstice',
      daysToMarker: 0,
      isPast: false
    }
  }
  
  const month = solarDate.month
  const day = solarDate.day
  
  // Calculate days into current season
  let daysIntoSeason: number
  let currentSeason: string
  
  if (month <= 3) {
    // Summer: months 1-3
    daysIntoSeason = (month - 1) * 30 + day
    currentSeason = 'Summer'
  } else if (month <= 6) {
    // Fall: months 4-6
    daysIntoSeason = (month - 4) * 30 + day
    currentSeason = 'Fall'
  } else if (month <= 9) {
    // Winter: months 7-9
    daysIntoSeason = (month - 7) * 30 + day
    currentSeason = 'Winter'
  } else {
    // Spring: months 10-12
    daysIntoSeason = (month - 10) * 30 + day
    currentSeason = 'Spring'
  }
  
  // Calculate days to nearest solstice/equinox
  // Summer Solstice: end of month 12 / start of year (solstice days)
  // Fall Equinox: month 4, day 1
  // Winter Solstice: month 7, day 1
  // Spring Equinox: month 10, day 1
  
  const dayOfYear = (month - 1) * 30 + day
  const markers = [
    { name: 'Fall Equinox', dayOfYear: 90 },      // Month 4, day 1 = day 91, but equinox is transition
    { name: 'Winter Solstice', dayOfYear: 180 },  // Month 7, day 1
    { name: 'Spring Equinox', dayOfYear: 270 },   // Month 10, day 1
    { name: 'Summer Solstice', dayOfYear: 360 },  // End of year (solstice days)
  ]
  
  let nearestMarker = ''
  let daysToMarker = Infinity
  let isPast = false
  
  for (const marker of markers) {
    const daysUntil = marker.dayOfYear - dayOfYear
    const daysSince = dayOfYear - marker.dayOfYear
    
    if (Math.abs(daysUntil) < Math.abs(daysToMarker)) {
      daysToMarker = daysUntil
      nearestMarker = marker.name
      isPast = daysUntil < 0
    }
  }
  
  // Also check summer solstice from previous year perspective
  const daysToSummerSolsticeNextYear = 360 - dayOfYear
  if (daysToSummerSolsticeNextYear < Math.abs(daysToMarker)) {
    daysToMarker = daysToSummerSolsticeNextYear
    nearestMarker = 'Summer Solstice'
    isPast = false
  }
  
  return {
    daysIntoSeason,
    seasonLength: SEASON_LENGTH,
    nearestMarker,
    daysToMarker: Math.abs(daysToMarker),
    isPast
  }
}

/**
 * Get a color based on the season
 */
function getSeasonColor(solarDate: SolarDate): number {
  if (solarDate.isSolsticeDay) {
    return 0xFFD700 // Gold for solstice
  }
  
  if (solarDate.month <= 3) return 0xFF6B35 // Orange for summer
  if (solarDate.month <= 6) return 0xD4652F // Brown/orange for fall
  if (solarDate.month <= 9) return 0x4A90D9 // Blue for winter
  return 0x7CB342 // Green for spring
}

/**
 * Create the calendar embed (compact version)
 */
function createCalendarEmbed(guildId?: string): EmbedBuilder {
  const now = new Date()
  const solarDate = gregorianToSolar(now)
  const solarDayName = getSolarDayName(solarDate)
  const seasonEmoji = getSeasonEmoji(solarDate)
  const seasonColor = getSeasonColor(solarDate)
  const seasonName = getSolarSeason(solarDate)
  const moonEmoji = getMoonPhaseEmoji(now)
  
  // Build compact date strings
  const solarDayAbbrev = solarDate.isSolsticeDay ? '✨' : SOLAR_DAYS_OF_WEEK[solarDate.dayOfWeek!].substring(0, 3)
  const solarMonthAbbrev = solarDate.isSolsticeDay ? 'Sol' : SOLAR_MONTHS[solarDate.month - 1].substring(0, 3)
  const solarDateStr = solarDate.isSolsticeDay 
    ? `${solarDayAbbrev} · Sol ${solarDate.solsticeDay}, Y${solarDate.year}`
    : `${solarDayAbbrev} · ${solarMonthAbbrev} ${solarDate.day}, Y${solarDate.year}`
  
  const gregDayAbbrev = now.toLocaleDateString('en-US', { weekday: 'short' })
  const gregMonthAbbrev = now.toLocaleDateString('en-US', { month: 'short' })
  const gregDateStr = `${gregDayAbbrev} · ${gregMonthAbbrev} ${now.getDate()}, ${now.getFullYear()}`
  
  // Combined date line
  const combinedDate = `🌞 ${solarDateStr}  ⟷  📅 ${gregDateStr}`

  // Get season progress info
  const seasonProgress = getSeasonProgress(solarDate)
  const seasonProgressBar = buildProgressBar(seasonProgress.daysIntoSeason, seasonProgress.seasonLength, 10)
  const markerText = seasonProgress.isPast 
    ? `${seasonProgress.daysToMarker}d since ${seasonProgress.nearestMarker}`
    : `${seasonProgress.daysToMarker}d to ${seasonProgress.nearestMarker}`

  const embed = new EmbedBuilder()
    .setColor(seasonColor)
    .setTitle(`${seasonEmoji} ${moonEmoji} Today`)
    .setURL(WEBSITE_URL)
    .addFields({
      name: combinedDate,
      value: `**${seasonName}**\n${seasonProgressBar}\n${markerText}`,
      inline: false
    })

  // Add special message for Solstice Days
  if (solarDate.isSolsticeDay) {
    embed.addFields({
      name: '🎉 Solstice Celebration!',
      value: `**Solstice Day ${solarDate.solsticeDay}** — outside the regular calendar!`,
      inline: false
    })
  }

  // Add birthdays (compact) - only if guild ID is provided
  if (guildId) {
    const birthdayString = buildBirthdayString(guildId, solarDate)
    if (birthdayString) {
      embed.addFields({
        name: '🎁',
        value: birthdayString,
        inline: false
      })
    }
  }

  // Add compact 7-day view
  embed.addFields({
    name: '📆 Week',
    value: build7DayView(now),
    inline: true
  })

  // Add year progress with visual bar
  const totalDays = solarDate.isLeapYear ? 366 : 365
  embed.addFields({
    name: '📊 Year',
    value: buildProgressBar(solarDate.dayOfYear, totalDays),
    inline: true
  })

  embed
    .setFooter({
      text: 'Solar Calendar • Click title to view full calendar'
    })
    .setTimestamp()

  return embed
}

/**
 * Send the daily message to all configured guilds
 */
async function sendDailyMessages(): Promise<void> {
  const configuredGuilds = getAllConfiguredGuilds()
  
  if (configuredGuilds.length === 0) {
    console.log('📭 No guilds configured for daily messages')
    return
  }
  
  console.log(`📤 Sending daily messages to ${configuredGuilds.length} guild(s)...`)
  
  for (const settings of configuredGuilds) {
    try {
      const channel = await client.channels.fetch(settings.channel_id!) as TextChannel
      
      if (!channel) {
        console.error(`❌ Could not find channel: ${settings.channel_id} for guild ${settings.guild_id}`)
        continue
      }

      if (!channel.isTextBased()) {
        console.error(`❌ Channel is not a text channel for guild ${settings.guild_id}`)
        continue
      }

      const embed = createCalendarEmbed(settings.guild_id)
      await channel.send({ embeds: [embed] })
      
      console.log(`✅ Daily message sent to guild ${settings.guild_id} at ${new Date().toISOString()}`)
    } catch (error) {
      console.error(`❌ Error sending daily message to guild ${settings.guild_id}:`, error)
    }
  }
}

/**
 * Register slash commands with Discord globally
 */
async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!)
  
  try {
    console.log('🔄 Registering slash commands globally...')
    
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    )
    console.log('✅ Global slash commands registered (may take up to 1 hour to propagate)')
  } catch (error) {
    console.error('❌ Error registering slash commands:', error)
  }
}

/**
 * Handle /today command
 */
async function handleTodayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId
  const embed = createCalendarEmbed(guildId || undefined)
  await interaction.reply({ embeds: [embed] })
}

/**
 * Handle /setchannel command
 */
async function handleSetChannelCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const channel = interaction.options.getChannel('channel', true)
  setDailyChannel(interaction.guildId, channel.id)
  
  await interaction.reply({
    content: `✅ Daily solar calendar messages will now be sent to <#${channel.id}>`,
    ephemeral: true
  })
}

/**
 * Handle /removechannel command
 */
async function handleRemoveChannelCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  removeDailyChannel(interaction.guildId)
  
  await interaction.reply({
    content: '✅ Daily solar calendar messages have been disabled for this server.',
    ephemeral: true
  })
}

/**
 * Handle /addbirthday command
 */
async function handleAddBirthdayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const month = interaction.options.getInteger('month', true)
  const day = interaction.options.getInteger('day', true)
  const targetUser = interaction.options.getUser('user')
  
  // If a user option was provided and it's not the command user, check permissions
  if (targetUser && targetUser.id !== interaction.user.id) {
    const member = interaction.member
    if (!member || typeof member.permissions === 'string' || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need the "Manage Server" permission to add birthdays for other users.',
        ephemeral: true
      })
      return
    }
  }
  
  const user = targetUser || interaction.user
  const userName = user.displayName || user.username
  
  setBirthday(interaction.guildId, user.id, userName, month, day)
  
  const monthName = SOLAR_MONTHS[month - 1]
  await interaction.reply({
    content: `🎂 Birthday set for **${userName}**: ${monthName} ${day} (Solar Calendar)`,
    ephemeral: false
  })
}

/**
 * Handle /removebirthday command
 */
async function handleRemoveBirthdayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const targetUser = interaction.options.getUser('user')
  
  // If a user option was provided and it's not the command user, check permissions
  if (targetUser && targetUser.id !== interaction.user.id) {
    const member = interaction.member
    if (!member || typeof member.permissions === 'string' || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need the "Manage Server" permission to remove birthdays for other users.',
        ephemeral: true
      })
      return
    }
  }
  
  const user = targetUser || interaction.user
  const removed = removeBirthday(interaction.guildId, user.id)
  
  if (removed) {
    await interaction.reply({
      content: `✅ Birthday removed for **${user.displayName || user.username}**`,
      ephemeral: false
    })
  } else {
    await interaction.reply({
      content: `❌ No birthday found for **${user.displayName || user.username}**`,
      ephemeral: true
    })
  }
}

/**
 * Handle /listbirthdays command
 */
async function handleListBirthdaysCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const birthdays = getGuildBirthdays(interaction.guildId)
  
  if (birthdays.length === 0) {
    await interaction.reply({
      content: '📅 No birthdays have been added to this server yet. Use `/addbirthday` to add one!',
      ephemeral: false
    })
    return
  }
  
  const birthdayList = birthdays.map(b => {
    const monthName = SOLAR_MONTHS[b.month - 1]
    return `• **${b.user_name}**: ${monthName} ${b.day}`
  }).join('\n')
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🎂 Server Birthdays (Solar Calendar)')
    .setDescription(birthdayList)
    .setFooter({ text: `${birthdays.length} birthday(s) registered` })
  
  await interaction.reply({ embeds: [embed] })
}

/**
 * Handle /mybirthday command
 */
async function handleMyBirthdayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const birthday = getUserBirthday(interaction.guildId, interaction.user.id)
  
  if (!birthday) {
    await interaction.reply({
      content: '❌ You haven\'t set your birthday yet. Use `/addbirthday` to add it!',
      ephemeral: true
    })
    return
  }
  
  const monthName = SOLAR_MONTHS[birthday.month - 1]
  await interaction.reply({
    content: `🎂 Your birthday is set to: **${monthName} ${birthday.day}** (Solar Calendar)`,
    ephemeral: true
  })
}

/**
 * Handle /settings command
 */
async function handleSettingsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true })
    return
  }
  
  const settings = getServerSettings(interaction.guildId)
  const birthdays = getGuildBirthdays(interaction.guildId)
  
  const channelStatus = settings.channel_id 
    ? `<#${settings.channel_id}>` 
    : '_Not configured_'
  
  const embed = new EmbedBuilder()
    .setColor(0x4A90D9)
    .setTitle('⚙️ Solar Calendar Bot Settings')
    .addFields(
      { name: '📢 Daily Message Channel', value: channelStatus, inline: true },
      { name: '🎂 Registered Birthdays', value: `${birthdays.length} birthday(s)`, inline: true }
    )
    .setFooter({ text: 'Use /setchannel to configure • /addbirthday to add birthdays' })
  
  await interaction.reply({ embeds: [embed], ephemeral: true })
}

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user?.tag}`)
  console.log(`📅 Scheduled to post daily at: ${DEFAULT_CRON_SCHEDULE} (${DEFAULT_TIMEZONE})`)
  console.log(`🔗 Website URL: ${WEBSITE_URL}`)
  console.log(`💾 Using persistent SQLite database for server settings`)
  
  // Register slash commands
  await registerCommands()
  
  // Schedule the daily message
  cron.schedule(DEFAULT_CRON_SCHEDULE, () => {
    console.log('⏰ Cron triggered, sending daily messages...')
    sendDailyMessages()
  }, {
    timezone: DEFAULT_TIMEZONE
  })

  // Send a test message on startup (optional - comment out in production)
  // sendDailyMessages()
})

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  
  try {
    switch (interaction.commandName) {
      case 'today':
        await handleTodayCommand(interaction)
        break
      case 'setchannel':
        await handleSetChannelCommand(interaction)
        break
      case 'removechannel':
        await handleRemoveChannelCommand(interaction)
        break
      case 'addbirthday':
        await handleAddBirthdayCommand(interaction)
        break
      case 'removebirthday':
        await handleRemoveBirthdayCommand(interaction)
        break
      case 'listbirthdays':
        await handleListBirthdaysCommand(interaction)
        break
      case 'mybirthday':
        await handleMyBirthdayCommand(interaction)
        break
      case 'settings':
        await handleSettingsCommand(interaction)
        break
    }
  } catch (error) {
    console.error(`❌ Error handling command ${interaction.commandName}:`, error)
    const reply = interaction.replied || interaction.deferred
      ? interaction.followUp
      : interaction.reply
    await reply.call(interaction, { 
      content: '❌ An error occurred while processing the command.', 
      ephemeral: true 
    })
  }
})

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error)
})

// Login to Discord
console.log('🚀 Starting Solar Calendar Discord Bot...')
client.login(BOT_TOKEN)

