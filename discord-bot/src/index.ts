import { 
  Client, 
  EmbedBuilder, 
  GatewayIntentBits, 
  TextChannel,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction
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
import birthdayData from './birthdays.json' with { type: 'json' }

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

// Birthday type
interface Birthday {
  name: string
  month: number  // 1-12 solar month
  day: number    // 1-30 solar day
}

const birthdays: Birthday[] = birthdayData.birthdays

// Configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://solar-calendar.com'
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *'
const TIMEZONE = process.env.TIMEZONE || 'America/New_York'

if (!BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is required in .env')
  process.exit(1)
}

if (!CHANNEL_ID) {
  console.error('❌ DISCORD_CHANNEL_ID is required in .env')
  process.exit(1)
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('today')
    .setDescription('Show today\'s date in the Solar Calendar')
    .toJSON()
]

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
 * Get birthdays on a specific solar day (annual birthday)
 */
function getBirthdaysOnDay(month: number, day: number): Birthday[] {
  return birthdays.filter(b => b.month === month && b.day === day)
}

/**
 * Get monthly birthdays on a specific day (people whose birthday falls on this day number,
 * but NOT in the current month - to avoid duplicating annual birthdays)
 */
function getMonthlyBirthdaysOnDay(month: number, day: number): Birthday[] {
  return birthdays.filter(b => b.day === day && b.month !== month)
}

/**
 * Get monthly birthdays in a range around today (last N days and next N days)
 */
function getMonthlyBirthdaysInRange(solarDate: SolarDate, daysBefore: number = 3, daysAfter: number = 3): { 
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
    
    const monthlyBdays = getMonthlyBirthdaysOnDay(checkMonth, checkDay)
    if (monthlyBdays.length > 0) {
      results.push({
        offset,
        day: checkDay,
        names: monthlyBdays.map(b => b.name)
      })
    }
  }
  
  return results
}

/**
 * Get upcoming birthdays for the next N days
 */
function getUpcomingBirthdays(solarDate: SolarDate, daysAhead: number = 7): { day: number, month: number, names: string[] }[] {
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
    
    const bdays = getBirthdaysOnDay(currentMonth, currentDay)
    if (bdays.length > 0) {
      upcoming.push({
        day: currentDay,
        month: currentMonth,
        names: bdays.map(b => b.name)
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
function buildBirthdayString(solarDate: SolarDate): string | null {
  if (solarDate.isSolsticeDay) return null
  
  const todayBirthdays = getBirthdaysOnDay(solarDate.month, solarDate.day)
  const upcoming = getUpcomingBirthdays(solarDate, 7)
  const monthlyBirthdays = getMonthlyBirthdaysInRange(solarDate, 3, 3)
  
  if (todayBirthdays.length === 0 && upcoming.length === 0 && monthlyBirthdays.length === 0) {
    return null
  }
  
  const parts: string[] = []
  
  // Today's annual birthdays: 🎂 name
  if (todayBirthdays.length > 0) {
    parts.push(`🎂 **${todayBirthdays.map(b => b.name).join(', ')}**`)
  }
  
  // Upcoming annual birthdays: 🎈 name (day)
  if (upcoming.length > 0) {
    const upcomingStr = upcoming.map(u => 
      `${u.names.join(', ')}₊${u.day - solarDate.day > 0 ? u.day - solarDate.day : u.day + 30 - solarDate.day}`
    ).join(' ')
    parts.push(`🎈 ${upcomingStr}`)
  }
  
  // Monthly birthdays: 🧁 name↺ (with offset)
  if (monthlyBirthdays.length > 0) {
    const monthlyStr = monthlyBirthdays
      .sort((a, b) => a.offset - b.offset)
      .map(m => `${m.names.join(', ')}↺${formatOffsetSymbol(m.offset)}`)
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
function createCalendarEmbed(): EmbedBuilder {
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

  const embed = new EmbedBuilder()
    .setColor(seasonColor)
    .setTitle(`${seasonEmoji} ${moonEmoji} Today`)
    .setURL(WEBSITE_URL)
    .addFields({
      name: combinedDate,
      value: `**${seasonName}**`,
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

  // Add birthdays (compact)
  const birthdayString = buildBirthdayString(solarDate)
  if (birthdayString) {
    embed.addFields({
      name: '🎁',
      value: birthdayString,
      inline: false
    })
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
 * Send the daily message to the configured channel
 */
async function sendDailyMessage(): Promise<void> {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID!) as TextChannel
    
    if (!channel) {
      console.error('❌ Could not find channel:', CHANNEL_ID)
      return
    }

    if (!channel.isTextBased()) {
      console.error('❌ Channel is not a text channel')
      return
    }

    const embed = createCalendarEmbed()
    await channel.send({ embeds: [embed] })
    
    console.log(`✅ Daily message sent at ${new Date().toISOString()}`)
  } catch (error) {
    console.error('❌ Error sending daily message:', error)
  }
}

/**
 * Register slash commands with Discord (guild-specific for instant registration)
 */
async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!)
  
  try {
    console.log('🔄 Registering slash commands...')
    
    // Get the guild ID from the channel to register guild-specific commands (instant)
    const channel = await client.channels.fetch(CHANNEL_ID!) as TextChannel
    if (channel && channel.guild) {
      // Register to specific guild (instant)
      await rest.put(
        Routes.applicationGuildCommands(client.user!.id, channel.guild.id),
        { body: commands }
      )
      console.log(`✅ Slash commands registered to guild: ${channel.guild.name}`)
    } else {
      // Fallback to global commands (takes up to 1 hour)
      await rest.put(
        Routes.applicationCommands(client.user!.id),
        { body: commands }
      )
      console.log('✅ Global slash commands registered (may take up to 1 hour)')
    }
  } catch (error) {
    console.error('❌ Error registering slash commands:', error)
  }
}

/**
 * Handle slash command interactions
 */
async function handleTodayCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = createCalendarEmbed()
  await interaction.reply({ embeds: [embed] })
}

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user?.tag}`)
  console.log(`📅 Scheduled to post daily at: ${CRON_SCHEDULE} (${TIMEZONE})`)
  console.log(`📢 Channel ID: ${CHANNEL_ID}`)
  console.log(`🔗 Website URL: ${WEBSITE_URL}`)
  
  // Register slash commands
  await registerCommands()
  
  // Schedule the daily message
  cron.schedule(CRON_SCHEDULE, () => {
    console.log('⏰ Cron triggered, sending daily message...')
    sendDailyMessage()
  }, {
    timezone: TIMEZONE
  })

  // Send a test message on startup (optional - comment out in production)
  // sendDailyMessage()
})

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  
  if (interaction.commandName === 'today') {
    await handleTodayCommand(interaction)
  }
})

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error)
})

// Login to Discord
console.log('🚀 Starting Solar Calendar Discord Bot...')
client.login(BOT_TOKEN)

