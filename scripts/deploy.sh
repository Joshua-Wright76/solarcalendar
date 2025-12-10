#!/bin/bash

# Manual deployment script for solar-calendar with backend and Discord bot
# Usage: ./scripts/deploy.sh

set -e

# Configuration
IMAGE_NAME="solar-calendar"
EC2_USER="ec2-user"
EC2_HOST="${EC2_HOST:-ec2-44-255-192-172.us-west-2.compute.amazonaws.com}"
SSH_KEY="${SSH_KEY:-solarcalendarkeypair.pem}"

# Check for required environment variables
if [ -z "$COGNITO_USER_POOL_ID" ]; then
    echo "❌ ERROR: COGNITO_USER_POOL_ID environment variable is required"
    exit 1
fi

if [ -z "$COGNITO_CLIENT_ID" ]; then
    echo "❌ ERROR: COGNITO_CLIENT_ID environment variable is required"
    exit 1
fi

if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo "❌ ERROR: DISCORD_BOT_TOKEN environment variable is required"
    exit 1
fi

echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

echo "📦 Saving Docker image..."
docker save ${IMAGE_NAME}:latest | gzip > image.tar.gz

echo "📤 Copying image to EC2..."
scp -i ${SSH_KEY} -o StrictHostKeyChecking=no image.tar.gz ${EC2_USER}@${EC2_HOST}:/home/${EC2_USER}/

echo "🚀 Deploying to EC2..."
ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} << EOF
    # Load the Docker image
    gunzip -c /home/ec2-user/image.tar.gz | docker load
    
    # Create data directory for SQLite persistence
    mkdir -p /home/ec2-user/solar-calendar-data
    
    # Stop and remove existing container if it exists
    docker stop solar-calendar 2>/dev/null || true
    docker rm solar-calendar 2>/dev/null || true
    
    # Run the new container with volume mount for SQLite
    docker run -d \
        --name solar-calendar \
        --restart unless-stopped \
        -p 80:80 \
        -v /home/ec2-user/solar-calendar-data:/data \
        -e COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID}" \
        -e COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID}" \
        -e COGNITO_REGION="${COGNITO_REGION:-us-west-2}" \
        -e DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN}" \
        -e DISCORD_CHANNEL_ID="${DISCORD_CHANNEL_ID:-754114582615949326}" \
        -e WEBSITE_URL="${WEBSITE_URL:-http://${EC2_HOST}}" \
        -e CRON_SCHEDULE="${CRON_SCHEDULE:-0 8 * * *}" \
        -e TIMEZONE="${TIMEZONE:-America/New_York}" \
        -e NODE_ENV=production \
        solar-calendar:latest
    
    # Clean up
    rm -f /home/ec2-user/image.tar.gz
    docker image prune -f
    
    echo "✅ Deployment complete!"
EOF

# Clean up local image file
rm -f image.tar.gz

echo "🎉 Done! Your app is live at http://${EC2_HOST}"
echo ""
echo "📝 Don't forget to:"
echo "   1. Set up Cognito User Pool and get your Pool ID and Client ID"
echo "   2. Configure Google OAuth in Cognito (optional)"
echo "   3. Add DISCORD_BOT_TOKEN to GitHub secrets for CI/CD"
echo ""
echo "💾 SQLite database is persisted at: /home/ec2-user/solar-calendar-data/"
echo "🤖 Discord bot will post daily at 8:00 AM (configurable via CRON_SCHEDULE)"
