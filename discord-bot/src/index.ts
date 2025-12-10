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
 * Build the 7-day view string (3 days before, today, 3 days after)
 */
function build7DayView(today: Date): string {
  const lines: string[] = []
  
  for (let offset = -3; offset <= 3; offset++) {
    const date = getDateOffset(today, offset)
    const solarDate = gregorianToSolar(date)
    const solarShort = formatShortSolarDate(solarDate)
    const gregShort = formatShortGregorianDate(date)
    const solarDay = getSolarDayAbbrev(solarDate)
    
    const marker = offset === 0 ? '▶' : '  '
    const highlight = offset === 0 ? '**' : ''
    
    lines.push(`${marker} ${highlight}${solarDay} ${solarShort}${highlight} · ${gregShort}`)
  }
  
  return lines.join('\n')
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
 * Create the calendar embed
 */
function createCalendarEmbed(description?: string): EmbedBuilder {
  const now = new Date()
  const solarDate = gregorianToSolar(now)
  const solarFormatted = formatSolarDate(solarDate)
  const gregorianFormatted = formatGregorianDate(now)
  const solarDayName = getSolarDayName(solarDate)
  const seasonEmoji = getSeasonEmoji(solarDate)
  const seasonColor = getSeasonColor(solarDate)

  const embed = new EmbedBuilder()
    .setColor(seasonColor)
    .setTitle(`${seasonEmoji} Today's Date`)
    .setDescription(description || 'Here\'s today in both calendars:')
    .addFields(
      {
        name: '🌞 Solar Calendar',
        value: solarDayName 
          ? `**${solarDayName}**\n${solarFormatted}`
          : `**${solarFormatted}**\n✨ _Outside the regular week_`,
        inline: true
      },
      {
        name: '📅 Gregorian Calendar',
        value: gregorianFormatted,
        inline: true
      }
    )
    .setURL(WEBSITE_URL)

  // Add special message for Solstice Days
  if (solarDate.isSolsticeDay) {
    embed.addFields({
      name: '🎉 Solstice Celebration!',
      value: `Today is **Solstice Day ${solarDate.solsticeDay}** — a special day outside the regular calendar for celebration and reflection!`,
      inline: false
    })
  }

  // Add 7-day view
  embed.addFields({
    name: '📆 7-Day View',
    value: '```\n' + build7DayView(now) + '\n```',
    inline: false
  })

  // Add current weeks
  embed.addFields(
    {
      name: '🌞 Solar Week',
      value: '`' + buildSolarWeekView(now) + '`',
      inline: false
    },
    {
      name: '📅 Gregorian Week',
      value: '`' + buildGregorianWeekView(now) + '`',
      inline: false
    }
  )

  // Add day of year info
  const totalDays = solarDate.isLeapYear ? 366 : 365
  embed.addFields({
    name: '📊 Year Progress',
    value: `Day ${solarDate.dayOfYear} of ${totalDays} (${Math.round((solarDate.dayOfYear / totalDays) * 100)}%)`,
    inline: false
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

    const embed = createCalendarEmbed('Good morning! Here\'s today in both calendars:')
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
