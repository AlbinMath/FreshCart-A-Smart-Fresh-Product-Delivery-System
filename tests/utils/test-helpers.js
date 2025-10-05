// Test helper utilities for Playwright tests

class TestHelpers {
  /**
   * Wait for element to be visible and return it
   */
  static async waitForElement(page, selector, timeout = 10000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return page.locator(selector);
  }

  /**
   * Fill form field with validation
   */
  static async fillField(page, selector, value, options = {}) {
    const element = await this.waitForElement(page, selector);
    await element.clear();
    await element.fill(value);
    
    if (options.pressEnter) {
      await element.press('Enter');
    }
    
    if (options.waitForNavigation) {
      await page.waitForNavigation();
    }
  }

  /**
   * Login helper function
   */
  static async login(page, email, password) {
    await page.goto('/login');
    await this.fillField(page, '[data-testid="email-input"]', email);
    await this.fillField(page, '[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await page.waitForURL(/\/dashboard|\/home|\//, { timeout: 10000 });
  }

  /**
   * Logout helper function
   */
  static async logout(page) {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/login', { timeout: 10000 });
  }

  /**
   * Add product to cart
   */
  static async addToCart(page, productSelector) {
    await page.click(`${productSelector} [data-testid="add-to-cart"]`);
    
    // Wait for cart update notification or animation
    await page.waitForSelector('[data-testid="cart-notification"]', { 
      state: 'visible', 
      timeout: 5000 
    }).catch(() => {
      // If no notification, just wait a bit
      return page.waitForTimeout(1000);
    });
  }

  /**
   * Clear cart
   */
  static async clearCart(page) {
    await page.goto('/cart');
    
    const clearButton = page.locator('[data-testid="clear-cart"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForSelector('[data-testid="empty-cart-message"]');
    }
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for API response
   */
  static async waitForAPIResponse(page, urlPattern, method = 'GET') {
    return page.waitForResponse(response => 
      response.url().includes(urlPattern) && 
      response.request().method() === method &&
      response.status() === 200
    );
  }

  /**
   * Mock API response
   */
  static async mockAPIResponse(page, urlPattern, responseData, status = 200) {
    await page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Generate random email for testing
   */
  static generateTestEmail(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}@example.com`;
  }

  /**
   * Generate random phone number
   */
  static generateTestPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const firstPart = Math.floor(Math.random() * 900) + 100;
    const secondPart = Math.floor(Math.random() * 9000) + 1000;
    return `+1${areaCode}${firstPart}${secondPart}`;
  }

  /**
   * Check if element exists without throwing error
   */
  static async elementExists(page, selector) {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll element into view
   */
  static async scrollIntoView(page, selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for page to load completely
   */
  static async waitForPageLoad(page) {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Handle alert dialogs
   */
  static async handleAlert(page, action = 'accept', text = null) {
    page.on('dialog', async dialog => {
      if (text) {
        expect(dialog.message()).toContain(text);
      }
      if (action === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Upload file helper
   */
  static async uploadFile(page, inputSelector, filePath) {
    const fileInput = page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Verify URL pattern
   */
  static async verifyURL(page, pattern) {
    await page.waitForURL(pattern, { timeout: 10000 });
  }

  /**
   * Get text content of element
   */
  static async getTextContent(page, selector) {
    const element = await this.waitForElement(page, selector);
    return await element.textContent();
  }

  /**
   * Check if text is present on page
   */
  static async isTextPresent(page, text) {
    try {
      await page.getByText(text).waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = TestHelpers;