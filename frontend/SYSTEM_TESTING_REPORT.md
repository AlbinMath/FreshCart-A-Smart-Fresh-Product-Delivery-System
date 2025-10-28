# 5. SYSTEM TESTING

## 5.1 INTRODUCTION

This document outlines the system testing procedures and results for the FreshCart application. System testing is performed to verify that the integrated software system meets the specified requirements. The testing focuses on both functional and non-functional aspects of the application to ensure it behaves as expected under various conditions.

The testing approach includes automated testing using Playwright, which allows us to simulate user interactions with the application in a browser environment. This ensures that critical user flows such as authentication, registration, cart functionality, and seller product management work correctly.

## 5.2 TEST PLAN

The test plan encompasses various modules of the FreshCart application to ensure comprehensive coverage of functionality. The tests are designed to validate user roles, core features, and integration points within the system.

### 5.2.1 Test Objectives

- Validate authentication flows for all user roles (Admin, Seller, Delivery, Customer)
- Verify registration processes for new users
- Ensure cart functionality works as expected
- Confirm seller product management capabilities
- Validate UI elements and navigation paths

### 5.2.2 Test Environment

- **Frontend**: React 18 with Vite
- **Testing Framework**: Playwright
- **Browser**: Chromium (default)
- **Operating System**: Windows 25H2

### 5.2.3 Test Data

The tests use predefined user credentials for each role:
- Admin: freshcart912@gmail.com / Admin@123
- Seller: albintomathewmo@gmail.com / Sevenseas01
- Delivery: lijithmk2026@mca.ajce.in / LijithMK@2026
- Customer: albinmathew2026@mca.ajce.in / 123456

### 5.2.4 Test Cases

#### Authentication Tests
- Admin login with valid credentials
- Seller login with valid credentials
- Delivery login with valid credentials
- Customer login with valid credentials

#### Registration Tests
- Customer registration flow
- Seller registration flow

#### Cart Tests
- Customer can add products to cart
- Cart item quantity controls are present

#### Seller Products Tests
- Seller can access My Products page
- Product form elements are visible
- Existing products list is displayed

### 5.2.5 Test Execution

Tests are executed using the Playwright test runner with the following command:
```bash
npx playwright test
```

### 5.2.6 Test Results

All tests passed successfully with the following execution times:
- 10 tests executed using 8 workers
- Total execution time: 35.7s
- All authentication tests passed (4/4)
- All registration tests passed (2/2)
- All cart tests passed (1/1)
- All seller product tests passed (1/1)

### 5.2.7 Playwright Testing

Playwright testing is used to automate browser interactions and validate the application's behavior. The tests cover critical user journeys and ensure that UI elements are present and functional.

#### Test Configuration

Playwright is configured to run tests in Chromium browser with the following settings:
- Parallel execution with 8 workers
- Network idle state waiting for page loads
- Timeout settings for element interactions

#### Test Coverage

The Playwright tests cover the following areas:
- User authentication for all roles
- User registration flows
- Product addition to cart
- Seller product management interface
- UI element visibility and interactions

#### Test Reports

Test reports can be viewed using the following command:
```bash
npx playwright show-report
```

The reports provide detailed information about test execution, including:
- Test execution times
- Failed test details
- Screenshot evidence for failed tests
- Video recordings of test runs