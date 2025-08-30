#!/bin/bash

# DiscoveryBox.app Production Deployment Script
# Usage: ./scripts/deploy.sh

set -e  # Exit on error

echo "🎬 Starting DiscoveryBox.app deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Don't run this script as root"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Validate required environment variables
source .env
required_vars=("JWT_SECRET" "ALLOWED_ORIGINS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in .env"
        exit 1
    fi
done

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p database uploads ssl backups logs

# Set proper permissions
echo "🔧 Setting permissions..."
chmod 755 database uploads backups logs
chmod 600 .env

# Pull latest changes (if in git repo)
if [ -d ".git" ]; then
    echo "🔄 Pulling latest changes..."
    git pull origin main
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose down || true  # Stop existing containers
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
if curl -f -s http://localhost:5000/health > /dev/null; then
    echo "✅ Application is healthy"
else
    echo "❌ Application health check failed"
    docker-compose logs app
    exit 1
fi

# Show running containers
echo "📊 Running containers:"
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20 app

echo ""
echo "🎉 DiscoveryBox.app deployed successfully!"
echo "🌐 Application is running on port 5000"
echo "📊 Health check: http://localhost:5000/health"
echo ""
echo "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificate with Let's Encrypt"
echo "3. Configure Nginx reverse proxy"
echo "4. Set up monitoring and backups"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop services: docker-compose down"
echo ""