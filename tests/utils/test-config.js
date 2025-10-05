// Test setup utilities and constants
require('dotenv').config({ path: '.env.test' });

const TEST_CONFIG = {
  // Base URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  API_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  
  // Timeouts
  DEFAULT_TIMEOUT: parseInt(process.env.TIMEOUT) || 30000,
  SHORT_TIMEOUT: 5000,
  LONG_TIMEOUT: 60000,
  
  // Test data
  TEST_IMAGES_PATH: './test-files/images',
  TEST_DOCUMENTS_PATH: './test-files/documents',
  
  // Feature flags
  SKIP_EMAIL_VERIFICATION: process.env.SKIP_EMAIL_VERIFICATION === 'true',
  SKIP_PHONE_VERIFICATION: process.env.SKIP_PHONE_VERIFICATION === 'true',
  MOCK_PAYMENT_SERVICE: process.env.MOCK_PAYMENT_SERVICE === 'true',
  
  // Browser settings
  HEADLESS: process.env.HEADLESS === 'true',
  SLOW_MO: parseInt(process.env.SLOW_MO) || 0,
  
  // Test users
  ADMIN_EMAIL: 'admin@freshcart.test',
  ADMIN_PASSWORD: 'AdminPassword123!',
  CUSTOMER_EMAIL: 'customer@freshcart.test',
  CUSTOMER_PASSWORD: 'CustomerPassword123!',
  SELLER_EMAIL: 'seller@freshcart.test',
  SELLER_PASSWORD: 'SellerPassword123!',
  DELIVERY_EMAIL: 'delivery@freshcart.test',
  DELIVERY_PASSWORD: 'DeliveryPassword123!'
};

const SELECTORS = {
  // Common selectors used across tests
  LOADING: '[data-testid="loading"], .loading, .spinner',
  ERROR_MESSAGE: '[data-testid="error-message"], .error, .alert-danger',
  SUCCESS_MESSAGE: '[data-testid="success-message"], .success, .alert-success',
  MODAL: '[data-testid="modal"], .modal, .dialog',
  MODAL_CLOSE: '[data-testid="modal-close"], .modal-close, .close',
  CONFIRM_DIALOG: '[data-testid="confirm-dialog"], .confirm-dialog',
  TOAST: '[data-testid="toast"], .toast, .notification',
  
  // Form elements
  EMAIL_INPUT: '[data-testid="email-input"], input[type="email"], input[name="email"]',
  PASSWORD_INPUT: '[data-testid="password-input"], input[type="password"], input[name="password"]',
  SUBMIT_BUTTON: '[data-testid="submit-button"], button[type="submit"], .submit-btn',
  
  // Navigation
  USER_MENU: '[data-testid="user-menu"], .user-menu, .profile-menu',
  LOGOUT_BUTTON: '[data-testid="logout-button"], .logout-btn',
  
  // Cart
  CART_ICON: '[data-testid="cart-icon"], .cart-icon',
  CART_COUNT: '[data-testid="cart-count"], .cart-count, .badge',
  ADD_TO_CART: '[data-testid="add-to-cart"], .add-to-cart-btn'
};

const TEST_DATA = {
  // Sample product data
  SAMPLE_PRODUCT: {
    name: 'Test Product',
    price: 19.99,
    description: 'This is a test product for automation testing',
    category: 'test-category',
    image: 'test-product.jpg'
  },
  
  // Sample user data
  SAMPLE_USER: {
    name: 'Test User',
    email: 'testuser@example.com',
    phone: '+1234567890',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345'
    }
  },
  
  // Sample order data
  SAMPLE_ORDER: {
    items: [
      { name: 'Test Product 1', quantity: 2, price: 10.99 },
      { name: 'Test Product 2', quantity: 1, price: 15.99 }
    ],
    total: 37.97,
    paymentMethod: 'card'
  }
};

const MOCK_RESPONSES = {
  // Common mock API responses
  SUCCESS_RESPONSE: {
    success: true,
    message: 'Operation completed successfully'
  },
  
  ERROR_RESPONSE: {
    success: false,
    error: 'An error occurred'
  },
  
  LOGIN_SUCCESS: {
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer'
    }
  },
  
  PRODUCTS_RESPONSE: {
    products: [
      {
        id: 'product-1',
        name: 'Test Product 1',
        price: 10.99,
        image: 'product1.jpg',
        category: 'fruits',
        stock: 50
      },
      {
        id: 'product-2',
        name: 'Test Product 2',
        price: 15.99,
        image: 'product2.jpg',
        category: 'vegetables',
        stock: 30
      }
    ],
    total: 2,
    page: 1,
    totalPages: 1
  }
};

class TestUtils {
  /**
   * Generate a unique email for testing
   */
  static generateTestEmail(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}@freshcart.test`;
  }

  /**
   * Generate a unique phone number for testing
   */
  static generateTestPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const firstPart = Math.floor(Math.random() * 900) + 100;
    const secondPart = Math.floor(Math.random() * 9000) + 1000;
    return `+1${areaCode}${firstPart}${secondPart}`;
  }

  /**
   * Wait for a specified amount of time
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random string of specified length
   */
  static generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create mock API route
   */
  static createMockRoute(page, urlPattern, response, status = 200) {
    return page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Setup common mocks for tests
   */
  static async setupCommonMocks(page) {
    // Mock authentication check
    await this.createMockRoute(page, '**/api/auth/verify', {
      valid: true,
      user: { id: 'test-user', email: 'test@example.com' }
    });

    // Mock user profile
    await this.createMockRoute(page, '**/api/user/profile', {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer'
    });

    // Mock configuration
    await this.createMockRoute(page, '**/api/config', {
      features: {
        emailVerification: !TEST_CONFIG.SKIP_EMAIL_VERIFICATION,
        phoneVerification: !TEST_CONFIG.SKIP_PHONE_VERIFICATION
      }
    });
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData() {
    // This would connect to test database and clean up
    console.log('Cleaning up test data...');
  }

  /**
   * Take a screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: `test-results/screenshots/${filename}`,
      fullPage: true 
    });
    return filename;
  }

  /**
   * Log test step
   */
  static logStep(step, details = '') {
    console.log(`📝 Test Step: ${step}${details ? ' - ' + details : ''}`);
  }

  /**
   * Check if element exists without throwing error
   */
  static async elementExists(page, selector, timeout = 1000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current timestamp for test data
   */
  static getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format currency for testing
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Generate test order data
   */
  static generateTestOrder(itemCount = 2) {
    const items = [];
    let total = 0;

    for (let i = 0; i < itemCount; i++) {
      const price = Math.round((Math.random() * 20 + 5) * 100) / 100;
      const quantity = Math.floor(Math.random() * 3) + 1;
      
      items.push({
        id: `item-${i + 1}`,
        name: `Test Product ${i + 1}`,
        price,
        quantity,
        subtotal: price * quantity
      });
      
      total += price * quantity;
    }

    return {
      id: `order-${Date.now()}`,
      items,
      subtotal: total,
      tax: Math.round(total * 0.08 * 100) / 100,
      shipping: 5.99,
      total: Math.round((total + total * 0.08 + 5.99) * 100) / 100,
      status: 'pending',
      createdAt: this.getTimestamp()
    };
  }
}

module.exports = {
  TEST_CONFIG,
  SELECTORS,
  TEST_DATA,
  MOCK_RESPONSES,
  TestUtils
};