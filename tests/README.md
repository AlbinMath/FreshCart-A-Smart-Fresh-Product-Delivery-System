# FreshCart E2E Automation Tests

Comprehensive end-to-end testing suite for the FreshCart application using Playwright.

## 📁 Project Structure

```
tests/
├── e2e/                          # Test specifications
│   ├── auth.spec.js             # Authentication tests
│   ├── products.spec.js         # Product management tests  
│   ├── admin.spec.js            # Admin panel tests
│   └── delivery.spec.js         # Delivery verification tests
├── page-objects/                 # Page Object Models
│   ├── BasePage.js              # Base page with common functionality
│   ├── LoginPage.js             # Login page object
│   ├── RegisterPage.js          # Registration page object
│   ├── ProductsPage.js          # Products page object
│   ├── CartPage.js              # Shopping cart page object
│   ├── AdminPage.js             # Admin dashboard page object
│   └── DeliveryPage.js          # Delivery partner page object
├── fixtures/                     # Test data and fixtures
│   └── test-data.js             # Sample test data
├── utils/                        # Utility functions
│   ├── test-helpers.js          # Common test helper functions
│   ├── test-config.js           # Test configuration and constants
│   ├── global-setup.js          # Global test setup
│   └── global-teardown.js       # Global test cleanup
├── test-files/                   # Test assets (images, documents)
├── playwright.config.js          # Playwright configuration
├── lighthouse.config.js          # Performance testing config
├── package.json                  # Test dependencies
└── .env.test                     # Test environment variables
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- FreshCart backend and frontend running locally
- MongoDB and Redis running (for backend)

### Installation

1. **Navigate to tests directory:**
   ```bash
   cd tests
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your configuration
   ```

### Running Tests

#### Run all tests:
```bash
npm test
```

#### Run specific test suite:
```bash
npm run test:auth          # Authentication tests
npm run test:products      # Product management tests
npm run test:admin         # Admin panel tests
npm run test:delivery      # Delivery verification tests
```

#### Run tests in headed mode (visible browser):
```bash
npm run test:headed
```

#### Run tests in debug mode:
```bash
npm run test:debug
```

#### Run tests in UI mode:
```bash
npm run test:ui
```

#### Run tests on specific browser:
```bash
npm run test:chrome        # Chrome only
npm run test:firefox       # Firefox only
npm run test:safari        # Safari only
npm run test:mobile        # Mobile browsers
```

#### Generate and view test report:
```bash
npm run test:report
```

## 📊 Test Coverage

### Authentication Tests (`auth.spec.js`)
- ✅ User login/logout
- ✅ User registration  
- ✅ Password reset
- ✅ Email verification
- ✅ Google Sign-In integration
- ✅ Session management
- ✅ Form validation

### Product Management Tests (`products.spec.js`)
- ✅ Product listing and browsing
- ✅ Product search functionality
- ✅ Product filtering and sorting
- ✅ Product details modal
- ✅ Add to cart functionality
- ✅ Shopping cart operations
- ✅ Cart calculations and totals
- ✅ Coupon code application

### Admin Panel Tests (`admin.spec.js`)
- ✅ Admin dashboard overview
- ✅ User management (view, edit, block/unblock)
- ✅ Order management and status updates
- ✅ Product approval/rejection
- ✅ Seller license verification
- ✅ Data export functionality
- ✅ Admin security and permissions

### Delivery Verification Tests (`delivery.spec.js`)
- ✅ Delivery partner dashboard
- ✅ Order assignment and acceptance
- ✅ Delivery tracking and navigation
- ✅ Photo capture for delivery verification
- ✅ Customer signature collection
- ✅ Verification code validation
- ✅ Issue reporting
- ✅ Customer communication
- ✅ Delivery completion workflow

## 🎯 Page Object Model

Tests use the Page Object Model pattern for maintainable and reusable code:

```javascript
// Example usage
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('user@example.com', 'password');
await loginPage.verifyLoginSuccess();
```

### Base Page Features
- Common wait methods
- Screenshot capture
- Element interaction helpers
- URL verification
- Error handling

## 🔧 Configuration

### Playwright Configuration (`playwright.config.js`)
- **Multiple browsers**: Chrome, Firefox, Safari, Mobile
- **Parallel execution**: Tests run in parallel for faster execution
- **Automatic retries**: Failed tests retry automatically
- **Video recording**: Records videos on failure
- **Screenshots**: Captures screenshots on failure
- **Tracing**: Detailed execution traces for debugging

### Environment Configuration (`.env.test`)
```bash
# Application URLs
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000

# Test database
MONGODB_URI=mongodb://localhost:27017/freshcart_test

# Test settings
HEADLESS=true
TIMEOUT=30000
SKIP_EMAIL_VERIFICATION=true

# Mock services
MOCK_PAYMENT_SERVICE=true
MOCK_SMS_SERVICE=true
```

## 🤖 CI/CD Integration

### GitHub Actions Workflow
The project includes a comprehensive GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) that:

- **Runs on multiple events**: Push, PR, schedule, manual trigger
- **Tests multiple browsers**: Chrome, Firefox, Safari
- **Includes mobile testing**: Mobile Chrome and Safari
- **Performance testing**: Lighthouse CI integration
- **Security scanning**: OWASP ZAP baseline scan
- **Artifact collection**: Reports, screenshots, videos
- **Notifications**: Slack notifications on success/failure
- **Auto-cleanup**: Removes old test artifacts

### Running in CI
```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: npx playwright test
  working-directory: ./tests
```

## 📈 Test Reports

### HTML Report
```bash
npm run test:report
# Opens interactive HTML report with:
# - Test results overview
# - Screenshots and videos
# - Detailed error logs
# - Performance metrics
```

### JSON Report
```bash
# Generates test-results.json with programmatic access to results
npm test -- --reporter=json
```

## 🐛 Debugging Tests

### Visual Debugging
```bash
# Run with headed browser and slow motion
npm run test:debug

# Run specific test file
npx playwright test auth.spec.js --debug

# Run test with trace viewer
npx playwright test --trace on
```

### Using Playwright Inspector
```bash
# Set breakpoint in test code
await page.pause();

# Run test and inspector will open
npx playwright test auth.spec.js --headed
```

### Screenshots and Videos
- Screenshots: Captured automatically on test failure
- Videos: Recorded for failed tests
- Traces: Detailed execution traces available

## 🔍 Test Data Management

### Mock Data
Tests use mock data for consistent and isolated testing:

```javascript
// Example mock API response
await page.route('**/api/products', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockProducts)
  });
});
```

### Dynamic Test Data
```javascript
// Generate unique test data
const testEmail = TestHelpers.generateTestEmail('customer');
const testPhone = TestHelpers.generateTestPhone();
```

## 📋 Best Practices

### Test Organization
- **Descriptive test names**: Clear, specific test descriptions
- **Grouped tests**: Related tests grouped in describe blocks
- **Independent tests**: Each test can run independently
- **Setup and teardown**: Proper test setup and cleanup

### Page Object Pattern
- **Encapsulation**: Page elements and actions encapsulated
- **Reusability**: Page objects reused across multiple tests
- **Maintainability**: Changes to UI require minimal test updates
- **Abstraction**: Business logic separated from technical implementation

### Error Handling
- **Graceful failures**: Tests handle errors gracefully
- **Informative errors**: Clear error messages for debugging
- **Retry logic**: Automatic retries for flaky operations
- **Fallback strategies**: Alternative approaches when primary fails

## 🚨 Troubleshooting

### Common Issues

#### Tests failing locally but passing in CI
```bash
# Check browser versions
npx playwright --version

# Update browsers
npx playwright install

# Check environment variables
cat .env.test
```

#### Timeouts
```bash
# Increase timeout in playwright.config.js
timeout: 60000,

# Or use per-test timeout
test('slow test', async ({ page }) => {
  test.setTimeout(120000);
  // test code
});
```

#### Element not found
```javascript
// Use more flexible selectors
await page.locator('[data-testid="submit-button"], button[type="submit"], .submit-btn').click();

// Add explicit waits
await page.waitForSelector('[data-testid="submit-button"]');
```

#### Network issues
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check if frontend is running  
curl http://localhost:5173
```

### Debug Commands
```bash
# Run single test with full debug info
DEBUG=pw:api npx playwright test auth.spec.js --headed --project=chromium

# Generate trace for failed test
npx playwright test --trace retain-on-failure

# Show trace in browser
npx playwright show-trace test-results/trace.zip
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## 🤝 Contributing

### Adding New Tests
1. Create test file in `e2e/` directory
2. Use existing page objects or create new ones
3. Follow naming conventions and patterns
4. Add test to CI workflow if needed
5. Update documentation

### Adding New Page Objects
1. Extend `BasePage` class
2. Define element selectors
3. Implement page-specific methods
4. Add verification methods
5. Document public methods

### Test Guidelines
- Write clear, descriptive test names
- Use data-testid attributes for reliable element selection
- Mock external services and APIs
- Keep tests independent and idempotent
- Add proper error handling and cleanup

## 📄 License

This test suite is part of the FreshCart project and follows the same license terms.