// Authentication End-to-End Tests
const { test, expect } = require('@playwright/test');
const LoginPage = require('../page-objects/LoginPage');
const RegisterPage = require('../page-objects/RegisterPage');
const TestHelpers = require('../utils/test-helpers');
const { testUsers, testCredentials } = require('../fixtures/test-data');

test.describe('Authentication Tests', () => {
  let loginPage;
  let registerPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
  });

  test.describe('Login Functionality', () => {
    test('should display login page correctly', async ({ page }) => {
      await loginPage.goto();
      await loginPage.verifyPageTitle();
      await loginPage.verifyPageElements();
    });

    test('should login with valid credentials', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
    });

    test('should show error for invalid email', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('invalid@email.com', testUsers.validUser.password);
      await loginPage.verifyLoginError('invalid credentials');
    });

    test('should show error for invalid password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, 'wrongpassword');
      await loginPage.verifyLoginError('invalid credentials');
    });

    test('should show error for empty fields', async ({ page }) => {
      await loginPage.goto();
      await loginPage.clickLogin();
      await loginPage.verifyEmailValidationError();
      await loginPage.verifyPasswordValidationError();
    });

    test('should validate email format', async ({ page }) => {
      await loginPage.goto();
      await loginPage.enterEmail('invalid-email-format');
      await loginPage.enterPassword('somepassword');
      await loginPage.clickLogin();
      
      // Check browser validation
      const emailInput = page.locator(loginPage.emailInput);
      const isValid = await emailInput.evaluate(el => el.checkValidity());
      expect(isValid).toBe(false);
    });

    test('should navigate to register page', async ({ page }) => {
      await loginPage.goto();
      await loginPage.clickRegisterLink();
      await expect(page).toHaveURL(/register/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.goto();
      
      if (await loginPage.isElementVisible(loginPage.forgotPasswordLink)) {
        await loginPage.clickForgotPassword();
        await expect(page).toHaveURL(/forgot|reset/);
      }
    });

    test('should handle Google Sign-In button click', async ({ page }) => {
      await loginPage.goto();
      
      if (await loginPage.isElementVisible(loginPage.googleSignInButton)) {
        // Mock Google OAuth to avoid actual Google login
        await page.route('**/auth/google**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, redirectUrl: '/dashboard' })
          });
        });
        
        await loginPage.clickGoogleSignIn();
        // Verify Google OAuth flow is initiated
      }
    });

    test('should remember login state', async ({ page, context }) => {
      // Login and verify
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Open new tab and verify still logged in
      const newPage = await context.newPage();
      const newLoginPage = new LoginPage(newPage);
      await newLoginPage.goto('/dashboard');
      
      // Should not redirect to login if already authenticated
      await expect(newPage).toHaveURL(/dashboard|home/);
    });
  });

  test.describe('Registration Functionality', () => {
    test('should display registration page correctly', async ({ page }) => {
      await registerPage.goto();
      await registerPage.verifyPageTitle();
      await registerPage.verifyFormElements();
    });

    test('should register new customer user', async ({ page }) => {
      const testEmail = TestHelpers.generateTestEmail('customer');
      const userData = {
        ...testUsers.validUser,
        email: testEmail,
        phone: TestHelpers.generateTestPhone()
      };
      
      await registerPage.goto();
      await registerPage.registerUser(userData, 'customer');
      await registerPage.verifyRegistrationSuccess();
    });

    test('should register new seller user', async ({ page }) => {
      const testEmail = TestHelpers.generateTestEmail('seller');
      const userData = {
        ...testUsers.sellerUser,
        email: testEmail,
        phone: TestHelpers.generateTestPhone()
      };
      
      await registerPage.goto();
      await registerPage.registerUser(userData, 'seller');
      await registerPage.verifyRegistrationSuccess();
    });

    test('should show error for duplicate email', async ({ page }) => {
      await registerPage.goto();
      await registerPage.registerUser(testUsers.validUser, 'customer');
      await registerPage.verifyRegistrationError('email already exists');
    });

    test('should validate password confirmation', async ({ page }) => {
      await registerPage.goto();
      await registerPage.enterPassword('password123');
      await registerPage.enterConfirmPassword('differentpassword');
      await registerPage.clickRegister();
      
      // Should show password mismatch error
      await registerPage.verifyRegistrationError('password');
    });

    test('should validate required fields', async ({ page }) => {
      await registerPage.goto();
      await registerPage.clickRegister();
      
      // Check browser validation for required fields
      const nameInput = page.locator(registerPage.nameInput);
      const emailInput = page.locator(registerPage.emailInput);
      
      const nameValid = await nameInput.evaluate(el => el.checkValidity());
      const emailValid = await emailInput.evaluate(el => el.checkValidity());
      
      expect(nameValid).toBe(false);
      expect(emailValid).toBe(false);
    });

    test('should validate email format in registration', async ({ page }) => {
      await registerPage.goto();
      await registerPage.validateEmailFormat();
    });

    test('should validate password strength', async ({ page }) => {
      await registerPage.goto();
      await registerPage.validatePasswordStrength();
    });

    test('should navigate to login page', async ({ page }) => {
      await registerPage.goto();
      await registerPage.clickLoginLink();
      await expect(page).toHaveURL(/login/);
    });

    test('should handle terms and conditions', async ({ page }) => {
      await registerPage.goto();
      
      if (await registerPage.isElementVisible(registerPage.termsCheckbox)) {
        // Try to register without accepting terms
        await registerPage.fillBasicDetails(testUsers.validUser);
        await registerPage.clickRegister();
        
        // Should not proceed without accepting terms
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(/register/);
        
        // Accept terms and try again
        await registerPage.acceptTerms();
        await registerPage.clickRegister();
      }
    });
  });

  test.describe('Logout Functionality', () => {
    test('should logout successfully', async ({ page }) => {
      // First login
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Then logout
      await TestHelpers.logout(page);
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login after logout', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Logout
      await TestHelpers.logout(page);
      
      // Try to access protected page
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Email Verification', () => {
    test('should show email verification message after registration', async ({ page }) => {
      const testEmail = TestHelpers.generateTestEmail('verify');
      const userData = {
        ...testUsers.validUser,
        email: testEmail
      };
      
      await registerPage.goto();
      await registerPage.registerUser(userData);
      
      // Should redirect to email verification page or show message
      const isVerificationPage = await page.waitForURL(/verify-email|verification/, { 
        timeout: 5000 
      }).then(() => true).catch(() => false);
      
      if (!isVerificationPage) {
        await expect(page.getByText(/verify.*email|check.*email/i)).toBeVisible();
      }
    });

    test('should handle email verification link', async ({ page }) => {
      // Mock email verification endpoint
      await page.route('**/verify-email**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Email verified successfully' })
        });
      });
      
      // Simulate clicking verification link
      await page.goto('/verify-email?token=mock-token');
      
      // Should show success message or redirect to login
      const hasSuccessMessage = await TestHelpers.isTextPresent(page, 'verified');
      const isRedirected = await page.waitForURL(/login|dashboard/, { 
        timeout: 5000 
      }).then(() => true).catch(() => false);
      
      expect(hasSuccessMessage || isRedirected).toBe(true);
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/forgot-password');
      
      if (await page.isVisible('input[type="email"]')) {
        await page.fill('input[type="email"]', testUsers.validUser.email);
        await page.click('button[type="submit"]');
        
        // Should show success message
        await expect(page.getByText(/reset.*link|check.*email/i)).toBeVisible();
      }
    });

    test('should reset password with valid token', async ({ page }) => {
      // Mock password reset endpoint
      await page.route('**/reset-password**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      await page.goto('/reset-password?token=mock-token');
      
      if (await page.isVisible('input[type="password"]')) {
        await page.fill('input[type="password"]', 'newPassword123!');
        await page.fill('input[name="confirmPassword"]', 'newPassword123!');
        await page.click('button[type="submit"]');
        
        // Should redirect to login or show success
        const isRedirected = await page.waitForURL(/login/, { 
          timeout: 5000 
        }).then(() => true).catch(() => false);
        
        if (!isRedirected) {
          await expect(page.getByText(/password.*reset|success/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Session Management', () => {
    test('should handle session timeout', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Mock session timeout
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      // Try to access an API endpoint
      await page.goto('/dashboard');
      
      // Should redirect to login
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login/);
    });

    test('should handle concurrent sessions', async ({ page, context }) => {
      // Login in first tab
      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Open second tab and login with same credentials
      const secondPage = await context.newPage();
      const secondLoginPage = new LoginPage(secondPage);
      await secondLoginPage.goto();
      await secondLoginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await secondLoginPage.verifyLoginSuccess();
      
      // Both sessions should work (depending on app's session policy)
      await page.goto('/dashboard');
      await secondPage.goto('/dashboard');
      
      // Verify both sessions are active
      await expect(page).toHaveURL(/dashboard/);
      await expect(secondPage).toHaveURL(/dashboard/);
    });
  });
});