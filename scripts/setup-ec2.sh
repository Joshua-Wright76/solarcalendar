#!/bin/bash

# EC2 instance setup script
# Run this once on your EC2 instance to install Docker

set -e

echo "🔧 Updating system packages..."
sudo yum update -y

echo "🐳 Installing Docker..."
sudo yum install -y docker

echo "🚀 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

echo "👤 Adding ec2-user to docker group..."
sudo usermod -a -G docker ec2-user

echo "✅ Docker installation complete!"
echo "⚠️  Please log out and log back in for group changes to take effect."
echo ""
echo "After re-logging, verify with: docker --version"

