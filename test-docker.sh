#!/bin/bash

# Test Docker build and run

echo "🧪 Testing FreshCart Docker setup"

# Build the image
echo "🔨 Building Docker image..."
docker build -t freshcart-test .

# Run container in background
echo "🏃 Running container on port 8080..."
docker run -d -p 8080:80 --name freshcart-test-container freshcart-test

# Wait a moment for container to start
sleep 10

# Check if container is running
if docker ps | grep -q freshcart-test-container; then
    echo "✅ Container is running successfully!"
    echo "🌐 Visit http://localhost:8080 to see your application"
else
    echo "❌ Container failed to start"
    docker logs freshcart-test-container
fi

# Cleanup
echo "🧹 Cleaning up test container..."
docker stop freshcart-test-container
docker rm freshcart-test-container