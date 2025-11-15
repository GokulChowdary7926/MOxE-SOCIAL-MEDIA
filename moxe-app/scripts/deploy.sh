#!/bin/bash

# MOXE Production Deployment Script
# Deploys the application to production

set -e

echo "🚀 MOXE Production Deployment"
echo "============================="

# Check if running in production mode
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Validate environment
echo ""
echo "📋 Validating environment..."
./scripts/validate-production.sh

if [ $? -ne 0 ]; then
    echo "❌ Validation failed. Please fix issues before deploying."
    exit 1
fi

# Build Docker images
echo ""
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Run tests
echo ""
echo "🧪 Running tests..."
./scripts/test-production.sh

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix issues before deploying."
    exit 1
fi

# Deploy
echo ""
echo "🚀 Deploying application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo ""
echo "🏥 Checking service health..."
if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001/api"
echo "   Health:   http://localhost:5001/api/health"


