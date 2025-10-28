@echo off
setlocal

echo 🧪 Testing FreshCart Docker setup

REM Build the image
echo 🔨 Building Docker image...
docker build -t freshcart-test .

REM Run container in background
echo 🏃 Running container on port 8080...
docker run -d -p 8080:80 --name freshcart-test-container freshcart-test

REM Wait a moment for container to start
echo Waiting for container to start...
timeout /t 10 /nobreak >nul

REM Check if container is running
docker ps | findstr freshcart-test-container >nul
if %errorlevel% equ 0 (
    echo ✅ Container is running successfully!
    echo 🌐 Visit http://localhost:8080 to see your application
) else (
    echo ❌ Container failed to start
    docker logs freshcart-test-container
)

REM Cleanup
echo 🧹 Cleaning up test container...
docker stop freshcart-test-container
docker rm freshcart-test-container