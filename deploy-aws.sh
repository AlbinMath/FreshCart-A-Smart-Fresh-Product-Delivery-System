#!/bin/bash

# FreshCart AWS Deployment Script

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting FreshCart AWS Deployment${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null
then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Login to AWS ECR
echo -e "${YELLOW}🔑 Logging in to AWS ECR${NC}"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image${NC}"
docker build -t freshcart .

# Tag the image for ECR
echo -e "${YELLOW}🏷️  Tagging image for ECR${NC}"
docker tag freshcart:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/freshcart:latest

# Push to ECR
echo -e "${YELLOW}📤 Pushing image to ECR${NC}"
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/freshcart:latest

# Deploy to ECS (example command, adjust as needed)
echo -e "${YELLOW}🔄 Updating ECS service${NC}"
aws ecs update-service --cluster your-cluster-name --service your-service-name --force-new-deployment

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}Your FreshCart application should be running on AWS.${NC}"