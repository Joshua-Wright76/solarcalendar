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
- 💾 Per-server settings stored in SQLite database
- 🎂 Birthday tracking with annual and monthly celebrations

## Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/today` | Shows today's date in both Solar and Gregorian calendars | Everyone |
| `/setchannel` | Set the channel for daily solar calendar messages | Manage Server |
| `/removechannel` | Stop sending daily messages | Manage Server |
| `/addbirthday` | Add your birthday (or another user's with admin) | Everyone |
| `/removebirthday` | Remove your birthday (or another user's with admin) | Everyone |
| `/listbirthdays` | List all birthdays in this server | Everyone |
| `/mybirthday` | Show your registered birthday | Everyone |
| `/settings` | View current server settings | Everyone |

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

### 2. Configure the Bot

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   DISCORD_BOT_TOKEN=your_bot_token_here
   WEBSITE_URL=https://your-solar-calendar-site.com
   CRON_SCHEDULE=0 8 * * *
   TIMEZONE=America/New_York
   ```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### 4. Configure Each Server

Once the bot is running and invited to your server:

1. Use `/setchannel` to set the channel for daily messages (requires "Manage Server" permission)
2. Users can add their birthdays with `/addbirthday month:X day:Y`
3. Use `/settings` to view current configuration

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_BOT_TOKEN` | Your Discord bot token | (required) |
| `WEBSITE_URL` | URL to link in embeds | `https://solar-calendar.com` |
| `CRON_SCHEDULE` | Cron expression for scheduling | `0 8 * * *` (8:00 AM) |
| `TIMEZONE` | Timezone for the cron schedule | `America/New_York` |

**Note:** Channel configuration is now done per-server using the `/setchannel` command. Settings are stored in a persistent SQLite database at `./data/settings.db` (configurable via `DATABASE_PATH` env var).

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


