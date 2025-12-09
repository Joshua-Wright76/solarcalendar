#!/bin/bash

# Manual deployment script for solar-calendar
# Usage: ./scripts/deploy.sh

set -e

# Configuration
IMAGE_NAME="solar-calendar"
EC2_USER="ec2-user"
EC2_HOST="${EC2_HOST:-ec2-44-255-192-172.us-west-2.compute.amazonaws.com}"
SSH_KEY="${SSH_KEY:-solarcalendarkeypair.pem}"

echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

echo "📦 Saving Docker image..."
docker save ${IMAGE_NAME}:latest | gzip > image.tar.gz

echo "📤 Copying image to EC2..."
scp -i ${SSH_KEY} -o StrictHostKeyChecking=no image.tar.gz ${EC2_USER}@${EC2_HOST}:/home/${EC2_USER}/

echo "🚀 Deploying to EC2..."
ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} << 'EOF'
    # Load the Docker image
    gunzip -c /home/ec2-user/image.tar.gz | docker load
    
    # Stop and remove existing container if it exists
    docker stop solar-calendar 2>/dev/null || true
    docker rm solar-calendar 2>/dev/null || true
    
    # Run the new container
    docker run -d \
        --name solar-calendar \
        --restart unless-stopped \
        -p 80:80 \
        solar-calendar:latest
    
    # Clean up
    rm -f /home/ec2-user/image.tar.gz
    docker image prune -f
    
    echo "✅ Deployment complete!"
EOF

# Clean up local image file
rm -f image.tar.gz

echo "🎉 Done! Your app is live at http://${EC2_HOST}"

