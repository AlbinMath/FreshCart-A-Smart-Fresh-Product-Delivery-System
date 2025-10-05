// Base Page Object Model for common functionality
const { expect } = require('@playwright/test');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  async waitForElement(selector, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    return this.page.locator(selector);
  }

  async clickElement(selector) {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  async fillField(selector, value) {
    const element = await this.waitForElement(selector);
    await element.clear();
    await element.fill(value);
  }

  async getTextContent(selector) {
    const element = await this.waitForElement(selector);
    return await element.textContent();
  }

  async isElementVisible(selector, timeout = 5000) {
    try {
      await this.page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async waitForURL(pattern, timeout = 10000) {
    await this.page.waitForURL(pattern, { timeout });
  }

  async verifyPageTitle(title) {
    await expect(this.page).toHaveTitle(title);
  }

  async verifyURL(pattern) {
    await expect(this.page).toHaveURL(pattern);
  }

  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async handleAlert(action = 'accept') {
    this.page.on('dialog', async dialog => {
      if (action === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }
}

module.exports = BasePage;