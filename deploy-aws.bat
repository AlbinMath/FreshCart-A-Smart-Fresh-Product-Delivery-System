@echo off
setlocal

echo 🚀 Starting FreshCart AWS Deployment

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed. Please install it first.
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install it first.
    exit /b 1
)

REM Login to AWS ECR
echo 🔑 Logging in to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

REM Build Docker image
echo 🔨 Building Docker image
docker build -t freshcart .

REM Tag the image for ECR
echo 🏷️  Tagging image for ECR
docker tag freshcart:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/freshcart:latest

REM Push to ECR
echo 📤 Pushing image to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/freshcart:latest

REM Deploy to ECS (example command, adjust as needed)
echo 🔄 Updating ECS service
aws ecs update-service --cluster your-cluster-name --service your-service-name --force-new-deployment

echo ✅ Deployment completed successfully!
echo Your FreshCart application should be running on AWS.