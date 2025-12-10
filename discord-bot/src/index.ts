import { Client, EmbedBuilder, GatewayIntentBits, TextChannel } from 'discord.js'
import cron from 'node-cron'
import 'dotenv/config'
import {
  gregorianToSolar,
  formatSolarDate,
  formatGregorianDate,
  getSolarDayName,
  SolarDate
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
 * Create the daily calendar embed
 */
function createDailyEmbed(): EmbedBuilder {
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
    .setDescription('Good morning! Here\'s today in both calendars:')
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
    .setFooter({
      text: 'Solar Calendar • Click title to view full calendar'
    })
    .setTimestamp()

  // Add special message for Solstice Days
  if (solarDate.isSolsticeDay) {
    embed.addFields({
      name: '🎉 Solstice Celebration!',
      value: `Today is **Solstice Day ${solarDate.solsticeDay}** — a special day outside the regular calendar for celebration and reflection!`,
      inline: false
    })
  }

  // Add day of year info
  const totalDays = solarDate.isLeapYear ? 366 : 365
  embed.addFields({
    name: '📊 Year Progress',
    value: `Day ${solarDate.dayOfYear} of ${totalDays} (${Math.round((solarDate.dayOfYear / totalDays) * 100)}%)`,
    inline: false
  })

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

    const embed = createDailyEmbed()
    await channel.send({ embeds: [embed] })
    
    console.log(`✅ Daily message sent at ${new Date().toISOString()}`)
  } catch (error) {
    console.error('❌ Error sending daily message:', error)
  }
}

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user?.tag}`)
  console.log(`📅 Scheduled to post daily at: ${CRON_SCHEDULE} (${TIMEZONE})`)
  console.log(`📢 Channel ID: ${CHANNEL_ID}`)
  console.log(`🔗 Website URL: ${WEBSITE_URL}`)
  
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

// Handle errors
client.on('error', (error) => {
  console.error('❌ Discord client error:', error)
})

// Login to Discord
console.log('🚀 Starting Solar Calendar Discord Bot...')
client.login(BOT_TOKEN)
