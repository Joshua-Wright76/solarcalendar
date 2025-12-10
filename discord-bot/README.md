# Solar Calendar Discord Bot 🌞

A Discord bot that sends a daily embed message showing the current date in both the Solar Calendar and Gregorian Calendar systems.

## Features

- 📅 Daily scheduled messages with beautiful embeds
- ⚡ `/today` slash command for on-demand calendar info
- 🌞 Solar Calendar date with day of week
- 📆 Gregorian Calendar date
- 🎉 Special messages for Solstice Days
- 📊 Year progress indicator
- 🎨 Season-themed colors and emojis
- 🔗 Link to the full Solar Calendar website

## Commands

| Command | Description |
|---------|-------------|
| `/today` | Shows today's date in both Solar and Gregorian calendars |

## Setup

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "Token", click "Copy" to get your bot token
5. Under "Privileged Gateway Intents", you don't need any special intents
6. Go to "OAuth2" > "URL Generator"
   - Select **"bot"** and **"applications.commands"** under scopes
   - Select "Send Messages" and "Embed Links" under bot permissions
7. Copy the generated URL and use it to invite the bot to your server

### 2. Get Your Channel ID

1. In Discord, go to User Settings > Advanced > Enable "Developer Mode"
2. Right-click the channel where you want daily messages
3. Click "Copy Channel ID"

### 3. Configure the Bot

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CHANNEL_ID=your_channel_id_here
   WEBSITE_URL=https://your-solar-calendar-site.com
   CRON_SCHEDULE=0 8 * * *
   TIMEZONE=America/New_York
   ```

### 4. Install & Run

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_BOT_TOKEN` | Your Discord bot token | (required) |
| `DISCORD_CHANNEL_ID` | Channel ID for daily messages | (required) |
| `WEBSITE_URL` | URL to link in embeds | `https://solar-calendar.com` |
| `CRON_SCHEDULE` | Cron expression for scheduling | `0 8 * * *` (8:00 AM) |
| `TIMEZONE` | Timezone for the cron schedule | `America/New_York` |

### Cron Schedule Examples

- `0 8 * * *` - Every day at 8:00 AM
- `0 9 * * *` - Every day at 9:00 AM
- `30 7 * * *` - Every day at 7:30 AM
- `0 8 * * 1-5` - Weekdays only at 8:00 AM

## Running with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
npm run build
docker build -t solar-calendar-bot .
docker run -d --env-file .env solar-calendar-bot
```

## Running with PM2

```bash
npm run build
pm2 start dist/index.js --name solar-calendar-bot
pm2 save
```

## Example Embed

The bot sends a beautiful embed that looks like this:

```
┌─────────────────────────────────────┐
│ ☀️ Today's Date                     │
│                                     │
│ Good morning! Here's today in both  │
│ calendars:                          │
│                                     │
│ 🌞 Solar Calendar    📅 Gregorian   │
│ Thursday             Wednesday,     │
│ September 18,        December 10,   │
│ Year 25              2025           │
│                                     │
│ 📊 Year Progress                    │
│ Day 79 of 365 (22%)                 │
│                                     │
│ Solar Calendar • Click to view      │
└─────────────────────────────────────┘
```

## License

MIT
