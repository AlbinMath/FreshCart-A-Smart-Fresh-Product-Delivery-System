// Cart Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class CartPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Cart selectors
    this.cartContainer = '[data-testid="cart-container"], .cart, .shopping-cart';
    this.cartItems = '[data-testid="cart-items"], .cart-items';
    this.cartItem = '[data-testid="cart-item"], .cart-item, .cart-product';
    this.emptyCartMessage = '[data-testid="empty-cart"], .empty-cart, .cart-empty';
    
    // Cart item selectors
    this.itemImage = '[data-testid="item-image"], .item-image img';
    this.itemName = '[data-testid="item-name"], .item-name, .product-name';
    this.itemPrice = '[data-testid="item-price"], .item-price, .price';
    this.itemQuantity = '[data-testid="item-quantity"], .item-quantity input';
    this.increaseQty = '[data-testid="increase-quantity"], .qty-increase, button:has-text("+")';
    this.decreaseQty = '[data-testid="decrease-quantity"], .qty-decrease, button:has-text("-")';
    this.removeItem = '[data-testid="remove-item"], .remove-item, button:has-text("Remove")';
    this.itemSubtotal = '[data-testid="item-subtotal"], .item-subtotal, .subtotal';
    
    // Cart summary
    this.cartSummary = '[data-testid="cart-summary"], .cart-summary, .order-summary';
    this.subtotalAmount = '[data-testid="subtotal"], .subtotal-amount';
    this.taxAmount = '[data-testid="tax-amount"], .tax-amount';
    this.shippingAmount = '[data-testid="shipping-amount"], .shipping-amount';
    this.totalAmount = '[data-testid="total-amount"], .total-amount, .grand-total';
    this.itemCount = '[data-testid="item-count"], .item-count';
    
    // Cart actions
    this.clearCartButton = '[data-testid="clear-cart"], .clear-cart, button:has-text("Clear Cart")';
    this.checkoutButton = '[data-testid="checkout-button"], .checkout-btn, button:has-text("Checkout")';
    this.continueShoppingButton = '[data-testid="continue-shopping"], .continue-shopping';
    this.saveForLaterButton = '[data-testid="save-later"], .save-later';
    
    // Coupon/Discount
    this.couponInput = '[data-testid="coupon-input"], input[name="coupon"]';
    this.applyCouponButton = '[data-testid="apply-coupon"], .apply-coupon';
    this.couponError = '[data-testid="coupon-error"], .coupon-error';
    this.couponSuccess = '[data-testid="coupon-success"], .coupon-success';
    this.discountAmount = '[data-testid="discount-amount"], .discount-amount';
    
    // Notifications
    this.updateNotification = '[data-testid="cart-update"], .cart-notification';
    this.errorNotification = '[data-testid="cart-error"], .error-notification';
  }

  async goto() {
    await super.goto('/cart');
  }

  async getCartItemCount() {
    if (await this.isElementVisible(this.emptyCartMessage)) {
      return 0;
    }
    
    await this.waitForElement(this.cartItem);
    return await this.page.locator(this.cartItem).count();
  }

  async getItemByIndex(index) {
    const items = this.page.locator(this.cartItem);
    return items.nth(index);
  }

  async getItemByName(productName) {
    return this.page.locator(this.cartItem).filter({ hasText: productName });
  }

  async updateItemQuantity(itemIndex, quantity) {
    const item = await this.getItemByIndex(itemIndex);
    
    if (await item.locator(this.itemQuantity).isVisible()) {
      await item.locator(this.itemQuantity).clear();
      await item.locator(this.itemQuantity).fill(quantity.toString());
      await this.page.keyboard.press('Enter');
    } else {
      // Use increase/decrease buttons
      const currentQty = await this.getItemQuantity(itemIndex);
      const difference = quantity - currentQty;
      
      if (difference > 0) {
        for (let i = 0; i < difference; i++) {
          await item.locator(this.increaseQty).click();
          await this.page.waitForTimeout(300); // Wait between clicks
        }
      } else if (difference < 0) {
        for (let i = 0; i < Math.abs(difference); i++) {
          await item.locator(this.decreaseQty).click();
          await this.page.waitForTimeout(300);
        }
      }
    }
    
    await this.waitForCartUpdate();
  }

  async getItemQuantity(itemIndex) {
    const item = await this.getItemByIndex(itemIndex);
    
    if (await item.locator(this.itemQuantity).isVisible()) {
      const qtyValue = await item.locator(this.itemQuantity).inputValue();
      return parseInt(qtyValue) || 1;
    }
    
    // Try to get quantity from text
    const qtyText = await item.locator('[data-testid="quantity-display"]').textContent().catch(() => '1');
    return parseInt(qtyText.replace(/\D/g, '')) || 1;
  }

  async removeItem(itemIndex) {
    const item = await this.getItemByIndex(itemIndex);
    await item.locator(this.removeItem).click();
    
    // Handle confirmation dialog if present
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await this.waitForCartUpdate();
  }

  async removeItemByName(productName) {
    const item = await this.getItemByName(productName);
    await item.locator(this.removeItem).click();
    
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await this.waitForCartUpdate();
  }

  async clearCart() {
    if (await this.isElementVisible(this.clearCartButton)) {
      await this.clickElement(this.clearCartButton);
      
      // Handle confirmation dialog
      this.page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await this.waitForCartUpdate();
    }
  }

  async proceedToCheckout() {
    await this.clickElement(this.checkoutButton);
    await this.page.waitForURL(/checkout|payment/, { timeout: 10000 });
  }

  async continueShopping() {
    if (await this.isElementVisible(this.continueShoppingButton)) {
      await this.clickElement(this.continueShoppingButton);
      await this.page.waitForURL(/products|shop/, { timeout: 10000 });
    }
  }

  async applyCoupon(couponCode) {
    if (await this.isElementVisible(this.couponInput)) {
      await this.fillField(this.couponInput, couponCode);
      await this.clickElement(this.applyCouponButton);
      await this.waitForCartUpdate();
    }
  }

  async getSubtotal() {
    if (await this.isElementVisible(this.subtotalAmount)) {
      const subtotalText = await this.getTextContent(this.subtotalAmount);
      return parseFloat(subtotalText.replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  }

  async getTaxAmount() {
    if (await this.isElementVisible(this.taxAmount)) {
      const taxText = await this.getTextContent(this.taxAmount);
      return parseFloat(taxText.replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  }

  async getShippingAmount() {
    if (await this.isElementVisible(this.shippingAmount)) {
      const shippingText = await this.getTextContent(this.shippingAmount);
      return parseFloat(shippingText.replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  }

  async getDiscountAmount() {
    if (await this.isElementVisible(this.discountAmount)) {
      const discountText = await this.getTextContent(this.discountAmount);
      return parseFloat(discountText.replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  }

  async getTotalAmount() {
    if (await this.isElementVisible(this.totalAmount)) {
      const totalText = await this.getTextContent(this.totalAmount);
      return parseFloat(totalText.replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  }

  async getItemPrice(itemIndex) {
    const item = await this.getItemByIndex(itemIndex);
    const priceText = await item.locator(this.itemPrice).textContent();
    return parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
  }

  async getItemSubtotal(itemIndex) {
    const item = await this.getItemByIndex(itemIndex);
    
    if (await item.locator(this.itemSubtotal).isVisible()) {
      const subtotalText = await item.locator(this.itemSubtotal).textContent();
      return parseFloat(subtotalText.replace(/[^0-9.]/g, '')) || 0;
    }
    
    // Calculate from price and quantity
    const price = await this.getItemPrice(itemIndex);
    const quantity = await this.getItemQuantity(itemIndex);
    return price * quantity;
  }

  async waitForCartUpdate() {
    try {
      await this.page.waitForSelector(this.updateNotification, { state: 'visible', timeout: 3000 });
      await this.page.waitForTimeout(1000);
    } catch {
      // No notification, just wait briefly
      await this.page.waitForTimeout(500);
    }
  }

  async verifyEmptyCart() {
    await expect(this.page.locator(this.emptyCartMessage)).toBeVisible();
    
    const itemCount = await this.getCartItemCount();
    expect(itemCount).toBe(0);
  }

  async verifyCartHasItems(expectedCount = null) {
    await expect(this.page.locator(this.cartItems)).toBeVisible();
    
    const itemCount = await this.getCartItemCount();
    expect(itemCount).toBeGreaterThan(0);
    
    if (expectedCount !== null) {
      expect(itemCount).toBe(expectedCount);
    }
  }

  async verifyItemInCart(productName) {
    const item = await this.getItemByName(productName);
    await expect(item).toBeVisible();
  }

  async verifyItemNotInCart(productName) {
    const items = this.page.locator(this.cartItem).filter({ hasText: productName });
    await expect(items).toHaveCount(0);
  }

  async verifyCartCalculations() {
    const itemCount = await this.getCartItemCount();
    
    if (itemCount === 0) {
      await this.verifyEmptyCart();
      return;
    }
    
    // Calculate expected subtotal
    let expectedSubtotal = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemSubtotal = await this.getItemSubtotal(i);
      expectedSubtotal += itemSubtotal;
    }
    
    const actualSubtotal = await this.getSubtotal();
    expect(actualSubtotal).toBeCloseTo(expectedSubtotal, 2);
    
    // Verify total calculation
    const tax = await this.getTaxAmount();
    const shipping = await this.getShippingAmount();
    const discount = await this.getDiscountAmount();
    const expectedTotal = actualSubtotal + tax + shipping - discount;
    const actualTotal = await this.getTotalAmount();
    
    expect(actualTotal).toBeCloseTo(expectedTotal, 2);
  }

  async verifyCheckoutButtonEnabled() {
    await expect(this.page.locator(this.checkoutButton)).toBeEnabled();
  }

  async verifyCheckoutButtonDisabled() {
    await expect(this.page.locator(this.checkoutButton)).toBeDisabled();
  }

  async verifyCouponApplied(couponCode) {
    if (await this.isElementVisible(this.couponSuccess)) {
      await expect(this.page.locator(this.couponSuccess)).toBeVisible();
    }
    
    const discount = await this.getDiscountAmount();
    expect(discount).toBeGreaterThan(0);
  }

  async verifyCouponError() {
    await expect(this.page.locator(this.couponError)).toBeVisible();
  }

  async verifyItemDetails(itemIndex, expectedDetails) {
    const item = await this.getItemByIndex(itemIndex);
    
    if (expectedDetails.name) {
      const nameText = await item.locator(this.itemName).textContent();
      expect(nameText).toContain(expectedDetails.name);
    }
    
    if (expectedDetails.price) {
      const actualPrice = await this.getItemPrice(itemIndex);
      expect(actualPrice).toBeCloseTo(expectedDetails.price, 2);
    }
    
    if (expectedDetails.quantity) {
      const actualQuantity = await this.getItemQuantity(itemIndex);
      expect(actualQuantity).toBe(expectedDetails.quantity);
    }
  }
}

module.exports = CartPage;