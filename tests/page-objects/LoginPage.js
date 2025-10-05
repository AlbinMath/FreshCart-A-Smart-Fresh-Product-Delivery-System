// Login Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors
    this.emailInput = '[data-testid="email-input"], input[type="email"], input[name="email"]';
    this.passwordInput = '[data-testid="password-input"], input[type="password"], input[name="password"]';
    this.loginButton = '[data-testid="login-button"], button[type="submit"], .login-btn';
    this.registerLink = '[data-testid="register-link"], a[href*="register"], .register-link';
    this.forgotPasswordLink = '[data-testid="forgot-password-link"], a[href*="forgot"], .forgot-password';
    this.googleSignInButton = '[data-testid="google-signin"], .google-signin, button:has-text("Google")';
    this.errorMessage = '[data-testid="error-message"], .error, .alert-danger';
    this.successMessage = '[data-testid="success-message"], .success, .alert-success';
    
    // Form validation selectors
    this.emailError = '[data-testid="email-error"], .email-error';
    this.passwordError = '[data-testid="password-error"], .password-error';
  }

  async goto() {
    await super.goto('/login');
  }

  async enterEmail(email) {
    await this.fillField(this.emailInput, email);
  }

  async enterPassword(password) {
    await this.fillField(this.passwordInput, password);
  }

  async clickLogin() {
    await this.clickElement(this.loginButton);
  }

  async clickRegisterLink() {
    await this.clickElement(this.registerLink);
  }

  async clickForgotPassword() {
    await this.clickElement(this.forgotPasswordLink);
  }

  async clickGoogleSignIn() {
    await this.clickElement(this.googleSignInButton);
  }

  async login(email, password) {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  async verifyLoginSuccess() {
    // Wait for redirect to dashboard or home page
    await this.page.waitForURL(/\/dashboard|\/home|\/profile|\/$/, { timeout: 10000 });
  }

  async verifyLoginError(expectedMessage = null) {
    const errorElement = await this.waitForElement(this.errorMessage);
    await expect(errorElement).toBeVisible();
    
    if (expectedMessage) {
      const errorText = await errorElement.textContent();
      expect(errorText.toLowerCase()).toContain(expectedMessage.toLowerCase());
    }
  }

  async verifyEmailValidationError() {
    await expect(this.page.locator(this.emailError)).toBeVisible();
  }

  async verifyPasswordValidationError() {
    await expect(this.page.locator(this.passwordError)).toBeVisible();
  }

  async verifyFormElements() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.loginButton)).toBeVisible();
    await expect(this.page.locator(this.registerLink)).toBeVisible();
  }

  async isLoggedIn() {
    try {
      // Check if we're redirected to a protected page
      await this.page.waitForURL(/\/dashboard|\/home|\/profile/, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clearForm() {
    await this.page.locator(this.emailInput).clear();
    await this.page.locator(this.passwordInput).clear();
  }

  async verifyPageTitle() {
    await expect(this.page).toHaveTitle(/login|sign in/i);
  }

  async verifyPageElements() {
    // Verify all essential elements are present
    await this.verifyFormElements();
    
    if (await this.isElementVisible(this.googleSignInButton)) {
      await expect(this.page.locator(this.googleSignInButton)).toBeVisible();
    }
    
    if (await this.isElementVisible(this.forgotPasswordLink)) {
      await expect(this.page.locator(this.forgotPasswordLink)).toBeVisible();
    }
  }
}

module.exports = LoginPage;