#!/bin/bash

# FreshCart E2E Test Runner Script
# This script starts the required services and runs Playwright tests

set -e  # Exit on any error

echo "🚀 FreshCart E2E Test Runner"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
HEADLESS=true
BROWSER="chromium"
TEST_SUITE="all"
CLEANUP=true
BACKEND_PORT=5000
FRONTEND_PORT=5173

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADLESS=false
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --test-suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        --backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --help)
            echo "FreshCart E2E Test Runner"
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --headed              Run tests in headed mode (visible browser)"
            echo "  --browser BROWSER     Browser to use (chromium, firefox, webkit, all)"
            echo "  --test-suite SUITE    Test suite to run (all, auth, products, admin, delivery)"
            echo "  --no-cleanup          Don't clean up processes after tests"
            echo "  --backend-port PORT   Backend server port (default: 5000)"
            echo "  --frontend-port PORT  Frontend server port (default: 5173)"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests headless"
            echo "  $0 --headed --browser firefox         # Run in Firefox with visible browser"
            echo "  $0 --test-suite auth                  # Run only authentication tests"
            echo "  $0 --headed --test-suite products     # Run product tests with visible browser"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

# Store PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    if [ "$CLEANUP" = true ]; then
        print_status "Cleaning up processes..."
        
        if [ ! -z "$BACKEND_PID" ]; then
            print_status "Stopping backend server (PID: $BACKEND_PID)"
            kill $BACKEND_PID 2>/dev/null || true
        fi
        
        if [ ! -z "$FRONTEND_PID" ]; then
            print_status "Stopping frontend server (PID: $FRONTEND_PID)"
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        
        # Kill any remaining processes on the ports
        print_status "Cleaning up any remaining processes on ports $BACKEND_PORT and $FRONTEND_PORT"
        lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
        
        print_success "Cleanup completed"
    fi
}

# Set up trap for cleanup on script exit
trap cleanup EXIT

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check if MongoDB is running (optional check)
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed or not in PATH. Make sure MongoDB is running if needed."
    fi
    
    print_success "Prerequisites check passed"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Checking and installing dependencies..."
    
    # Backend dependencies
    if [ ! -d "../backend/node_modules" ]; then
        print_status "Installing backend dependencies..."
        (cd ../backend && npm install)
    fi
    
    # Frontend dependencies
    if [ ! -d "../frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        (cd ../frontend && npm install)
    fi
    
    # Test dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing test dependencies..."
        npm install
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "node_modules/@playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install
    fi
    
    print_success "Dependencies installation completed"
}

# Start backend server
start_backend() {
    print_status "Starting backend server on port $BACKEND_PORT..."
    
    # Check if port is already in use
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $BACKEND_PORT is already in use. Attempting to use existing server."
        return 0
    fi
    
    # Start backend server
    (cd ../backend && npm start) &
    BACKEND_PID=$!
    
    print_status "Backend server started with PID: $BACKEND_PID"
    
    # Wait for backend to be ready
    print_status "Waiting for backend server to be ready..."
    for i in {1..30}; do
        if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
            print_success "Backend server is ready"
            return 0
        fi
        sleep 2
    done
    
    print_error "Backend server failed to start or is not responding"
    return 1
}

# Start frontend server
start_frontend() {
    print_status "Starting frontend server on port $FRONTEND_PORT..."
    
    # Check if port is already in use
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $FRONTEND_PORT is already in use. Attempting to use existing server."
        return 0
    fi
    
    # Build frontend first
    print_status "Building frontend..."
    (cd ../frontend && npm run build)
    
    # Start frontend server
    (cd ../frontend && npm run preview -- --port $FRONTEND_PORT) &
    FRONTEND_PID=$!
    
    print_status "Frontend server started with PID: $FRONTEND_PID"
    
    # Wait for frontend to be ready
    print_status "Waiting for frontend server to be ready..."
    for i in {1..30}; do
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            print_success "Frontend server is ready"
            return 0
        fi
        sleep 2
    done
    
    print_error "Frontend server failed to start or is not responding"
    return 1
}

# Run tests
run_tests() {
    print_status "Running Playwright tests..."
    
    # Set environment variables
    export NODE_ENV=test
    export FRONTEND_URL="http://localhost:$FRONTEND_PORT"
    export API_BASE_URL="http://localhost:$BACKEND_PORT"
    
    # Construct test command
    TEST_CMD="npx playwright test"
    
    # Add browser selection
    if [ "$BROWSER" != "all" ]; then
        TEST_CMD="$TEST_CMD --project=$BROWSER"
    fi
    
    # Add headless/headed mode
    if [ "$HEADLESS" = false ]; then
        TEST_CMD="$TEST_CMD --headed"
    fi
    
    # Add test suite selection
    case $TEST_SUITE in
        "auth")
            TEST_CMD="$TEST_CMD e2e/auth.spec.js"
            ;;
        "products")
            TEST_CMD="$TEST_CMD e2e/products.spec.js"
            ;;
        "admin")
            TEST_CMD="$TEST_CMD e2e/admin.spec.js"
            ;;
        "delivery")
            TEST_CMD="$TEST_CMD e2e/delivery.spec.js"
            ;;
        "all")
            # Run all tests (default)
            ;;
        *)
            print_error "Unknown test suite: $TEST_SUITE"
            return 1
            ;;
    esac
    
    print_status "Executing: $TEST_CMD"
    
    # Run the tests
    if $TEST_CMD; then
        print_success "Tests completed successfully"
        return 0
    else
        print_error "Tests failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    if [ -f "playwright-report/index.html" ]; then
        print_success "Test report generated: playwright-report/index.html"
        
        # Try to open report in browser (optional)
        if command -v xdg-open &> /dev/null; then
            print_status "Opening test report in browser..."
            xdg-open playwright-report/index.html &
        elif command -v open &> /dev/null; then
            print_status "Opening test report in browser..."
            open playwright-report/index.html &
        fi
    else
        print_warning "No test report found"
    fi
}

# Main execution
main() {
    print_status "Starting FreshCart E2E Test Suite"
    print_status "Configuration:"
    print_status "  - Browser: $BROWSER"
    print_status "  - Test Suite: $TEST_SUITE"
    print_status "  - Headless: $HEADLESS"
    print_status "  - Backend Port: $BACKEND_PORT"
    print_status "  - Frontend Port: $FRONTEND_PORT"
    print_status "  - Cleanup: $CLEANUP"
    echo ""
    
    # Execute steps
    check_prerequisites
    install_dependencies
    
    # Start servers
    if ! start_backend; then
        print_error "Failed to start backend server"
        exit 1
    fi
    
    if ! start_frontend; then
        print_error "Failed to start frontend server"
        exit 1
    fi
    
    # Run tests
    if run_tests; then
        print_success "All tests completed successfully! 🎉"
        generate_report
        exit 0
    else
        print_error "Tests failed! ❌"
        generate_report
        exit 1
    fi
}

# Run main function
main