# 🚀 Quick Start Guide for FreshCart E2E Tests

## Running Tests Locally

### Option 1: Quick Smoke Tests (Recommended for CI)
```bash
cd tests
npm install
npx playwright install chromium
npm run test:smoke
```

### Option 2: Full Application Tests (Requires Running Apps)

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Run Tests (in new terminal):**
   ```bash
   cd tests
   npm install
   npx playwright install
   npm run test:auth    # Run auth tests only
   npm run test:headed  # Run with visible browser
   ```

### Option 3: Automated Test Runner (Windows)
```bash
cd tests
.\run-tests.bat --headed --test-suite auth
```

## Test Suites Available

- **Smoke Tests** (`smoke.spec.js`) - Basic functionality, no backend required
- **Auth Tests** (`auth.spec.js`) - Login, registration, user management
- **Products Tests** (`products.spec.js`) - Product browsing, cart, checkout
- **Admin Tests** (`admin.spec.js`) - Admin panel functionality
- **Delivery Tests** (`delivery.spec.js`) - Delivery verification workflow

## CI/CD Information

The GitHub Actions workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual trigger via GitHub Actions UI

**Default CI Behavior:**
- Runs smoke tests only (no backend/frontend required)
- Uses Chromium browser
- Uploads test reports as artifacts
- Comments on PRs with test results

## Troubleshooting

### CI Failures
1. **"Tests failed after 2s"** - Usually dependency installation issues
2. **"Cannot find module"** - Package.json dependencies missing
3. **"Timeout"** - Server startup issues (not needed for smoke tests)

### Local Development
1. **Port conflicts** - Make sure ports 5000 and 5173 are free
2. **Browser not found** - Run `npx playwright install`
3. **Tests hang** - Check if backend/frontend are running

## Configuration

Edit `tests/.env.test` to customize:
```bash
NODE_ENV=test
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000
HEADLESS=true
```

## Quick Commands Reference

```bash
# Install everything
npm run setup

# Run different test suites
npm run test:smoke     # Smoke tests (CI-friendly)
npm run test:auth      # Authentication tests
npm run test:products  # Product management tests
npm run test:admin     # Admin panel tests
npm run test:delivery  # Delivery verification tests

# Debug options
npm run test:headed    # Visible browser
npm run test:debug     # Step-by-step debugging
npm run test:ui        # Interactive test runner

# View results
npm run test:report    # Open HTML report
```

## GitHub Actions Workflow

To trigger specific test suites in CI:
1. Go to GitHub Actions tab
2. Click "E2E Tests with Playwright"
3. Click "Run workflow"
4. Select test suite and browser
5. Click "Run workflow"

The workflow is designed to be:
- ✅ Fast (smoke tests complete in ~2 minutes)
- ✅ Reliable (mocks external dependencies)
- ✅ Informative (detailed reports and screenshots)
- ✅ Non-blocking (uses `continue-on-error` for optional steps)