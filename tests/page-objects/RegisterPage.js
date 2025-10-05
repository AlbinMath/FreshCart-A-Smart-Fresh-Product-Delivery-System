// Registration Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors
    this.nameInput = '[data-testid="name-input"], input[name="name"], input[name="fullName"]';
    this.emailInput = '[data-testid="email-input"], input[type="email"], input[name="email"]';
    this.phoneInput = '[data-testid="phone-input"], input[name="phone"], input[type="tel"]';
    this.passwordInput = '[data-testid="password-input"], input[type="password"], input[name="password"]';
    this.confirmPasswordInput = '[data-testid="confirm-password-input"], input[name="confirmPassword"]';
    this.registerButton = '[data-testid="register-button"], button[type="submit"], .register-btn';
    this.loginLink = '[data-testid="login-link"], a[href*="login"], .login-link';
    this.googleSignUpButton = '[data-testid="google-signup"], .google-signup, button:has-text("Google")';
    this.termsCheckbox = '[data-testid="terms-checkbox"], input[name="terms"]';
    this.errorMessage = '[data-testid="error-message"], .error, .alert-danger';
    this.successMessage = '[data-testid="success-message"], .success, .alert-success';
    
    // Role selection (if applicable)
    this.roleSelector = '[data-testid="role-selector"], select[name="role"]';
    this.customerRole = '[data-testid="customer-role"], input[value="customer"]';
    this.sellerRole = '[data-testid="seller-role"], input[value="seller"]';
    
    // Seller specific fields
    this.businessNameInput = '[data-testid="business-name"], input[name="businessName"]';
    this.licenseNumberInput = '[data-testid="license-number"], input[name="licenseNumber"]';
    this.licenseUpload = '[data-testid="license-upload"], input[type="file"][name="license"]';
    
    // Address fields
    this.addressInput = '[data-testid="address-input"], input[name="address"]';
    this.cityInput = '[data-testid="city-input"], input[name="city"]';
    this.stateInput = '[data-testid="state-input"], input[name="state"]';
    this.zipCodeInput = '[data-testid="zipcode-input"], input[name="zipCode"]';
  }

  async goto() {
    await super.goto('/register');
  }

  async enterName(name) {
    await this.fillField(this.nameInput, name);
  }

  async enterEmail(email) {
    await this.fillField(this.emailInput, email);
  }

  async enterPhone(phone) {
    await this.fillField(this.phoneInput, phone);
  }

  async enterPassword(password) {
    await this.fillField(this.passwordInput, password);
  }

  async enterConfirmPassword(password) {
    await this.fillField(this.confirmPasswordInput, password);
  }

  async selectRole(role) {
    if (await this.isElementVisible(this.roleSelector)) {
      await this.page.selectOption(this.roleSelector, role);
    } else if (role === 'customer' && await this.isElementVisible(this.customerRole)) {
      await this.clickElement(this.customerRole);
    } else if (role === 'seller' && await this.isElementVisible(this.sellerRole)) {
      await this.clickElement(this.sellerRole);
    }
  }

  async enterBusinessName(businessName) {
    if (await this.isElementVisible(this.businessNameInput)) {
      await this.fillField(this.businessNameInput, businessName);
    }
  }

  async enterLicenseNumber(licenseNumber) {
    if (await this.isElementVisible(this.licenseNumberInput)) {
      await this.fillField(this.licenseNumberInput, licenseNumber);
    }
  }

  async uploadLicense(filePath) {
    if (await this.isElementVisible(this.licenseUpload)) {
      await this.page.setInputFiles(this.licenseUpload, filePath);
    }
  }

  async acceptTerms() {
    if (await this.isElementVisible(this.termsCheckbox)) {
      await this.clickElement(this.termsCheckbox);
    }
  }

  async clickRegister() {
    await this.clickElement(this.registerButton);
  }

  async clickLoginLink() {
    await this.clickElement(this.loginLink);
  }

  async clickGoogleSignUp() {
    await this.clickElement(this.googleSignUpButton);
  }

  async fillBasicDetails(userData) {
    await this.enterName(userData.name);
    await this.enterEmail(userData.email);
    await this.enterPhone(userData.phone);
    await this.enterPassword(userData.password);
    
    if (await this.isElementVisible(this.confirmPasswordInput)) {
      await this.enterConfirmPassword(userData.password);
    }
  }

  async fillAddress(addressData) {
    if (await this.isElementVisible(this.addressInput)) {
      await this.fillField(this.addressInput, addressData.street);
    }
    if (await this.isElementVisible(this.cityInput)) {
      await this.fillField(this.cityInput, addressData.city);
    }
    if (await this.isElementVisible(this.stateInput)) {
      await this.fillField(this.stateInput, addressData.state);
    }
    if (await this.isElementVisible(this.zipCodeInput)) {
      await this.fillField(this.zipCodeInput, addressData.zipCode);
    }
  }

  async registerUser(userData, role = 'customer') {
    await this.fillBasicDetails(userData);
    
    if (await this.isElementVisible(this.roleSelector)) {
      await this.selectRole(role);
    }
    
    if (role === 'seller') {
      await this.enterBusinessName(userData.businessName);
      await this.enterLicenseNumber(userData.licenseNumber);
    }
    
    if (userData.address) {
      await this.fillAddress(userData.address);
    }
    
    await this.acceptTerms();
    await this.clickRegister();
  }

  async verifyRegistrationSuccess() {
    // Check for success message or redirect
    const isRedirected = await this.page.waitForURL(/\/dashboard|\/login|\/verify-email/, { 
      timeout: 10000 
    }).then(() => true).catch(() => false);
    
    if (!isRedirected) {
      await expect(this.page.locator(this.successMessage)).toBeVisible();
    }
  }

  async verifyRegistrationError(expectedMessage = null) {
    const errorElement = await this.waitForElement(this.errorMessage);
    await expect(errorElement).toBeVisible();
    
    if (expectedMessage) {
      const errorText = await errorElement.textContent();
      expect(errorText.toLowerCase()).toContain(expectedMessage.toLowerCase());
    }
  }

  async verifyFormElements() {
    await expect(this.page.locator(this.nameInput)).toBeVisible();
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.registerButton)).toBeVisible();
    await expect(this.page.locator(this.loginLink)).toBeVisible();
  }

  async verifyPageTitle() {
    await expect(this.page).toHaveTitle(/register|sign up|create account/i);
  }

  async clearForm() {
    const inputs = [
      this.nameInput,
      this.emailInput,
      this.phoneInput,
      this.passwordInput,
      this.confirmPasswordInput
    ];
    
    for (const input of inputs) {
      if (await this.isElementVisible(input)) {
        await this.page.locator(input).clear();
      }
    }
  }

  async validateEmailFormat() {
    // Enter invalid email and check validation
    await this.enterEmail('invalid-email');
    await this.clickRegister();
    
    // Should show validation error
    const isValid = await this.page.locator(this.emailInput).evaluate(
      el => el.checkValidity()
    );
    expect(isValid).toBe(false);
  }

  async validatePasswordStrength() {
    // Test weak password
    await this.enterPassword('123');
    
    // Check if password strength indicator appears
    const strengthIndicator = '[data-testid="password-strength"], .password-strength';
    if (await this.isElementVisible(strengthIndicator)) {
      await expect(this.page.locator(strengthIndicator)).toBeVisible();
    }
  }
}

module.exports = RegisterPage;