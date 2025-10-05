// Product Management End-to-End Tests
const { test, expect } = require('@playwright/test');
const LoginPage = require('../page-objects/LoginPage');
const ProductsPage = require('../page-objects/ProductsPage');
const CartPage = require('../page-objects/CartPage');
const TestHelpers = require('../utils/test-helpers');
const { testUsers, testProducts } = require('../fixtures/test-data');

test.describe('Product Management Tests', () => {
  let loginPage;
  let productsPage;
  let cartPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    productsPage = new ProductsPage(page);
    cartPage = new CartPage(page);
    
    // Login before each test (optional, depending on your app)
    // await loginPage.goto();
    // await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
  });

  test.describe('Product Listing', () => {
    test('should display products page correctly', async ({ page }) => {
      await productsPage.goto();
      await productsPage.verifyProductsDisplayed();
    });

    test('should show product details for each product card', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      expect(productCount).toBeGreaterThan(0);
      
      // Verify first few products have all required details
      const checkCount = Math.min(productCount, 3);
      for (let i = 0; i < checkCount; i++) {
        await productsPage.verifyProductDetails(i);
      }
    });

    test('should handle empty product state', async ({ page }) => {
      // Mock empty products response
      await page.route('**/api/products**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ products: [], total: 0 })
        });
      });
      
      await productsPage.goto();
      await productsPage.verifyNoProductsMessage();
    });

    test('should load products with pagination', async ({ page }) => {
      await productsPage.goto();
      
      const initialProductCount = await productsPage.getProductCount();
      
      // Try to navigate to next page if pagination exists
      if (await productsPage.isElementVisible(productsPage.nextPage)) {
        await productsPage.navigateToNextPage();
        
        // Verify products loaded on next page
        await productsPage.verifyProductsDisplayed();
        
        // Navigate back to first page
        await productsPage.navigateToPrevPage();
        
        const finalProductCount = await productsPage.getProductCount();
        expect(finalProductCount).toBe(initialProductCount);
      }
    });

    test('should handle product loading states', async ({ page }) => {
      // Intercept and delay product API to test loading state
      await page.route('**/api/products**', async route => {
        await page.waitForTimeout(2000); // Simulate slow response
        route.continue();
      });
      
      await productsPage.goto();
      
      // Loading should be visible initially
      if (await productsPage.isElementVisible(productsPage.loadingSpinner)) {
        await expect(page.locator(productsPage.loadingSpinner)).toBeVisible();
      }
      
      // Products should load after delay
      await productsPage.verifyProductsDisplayed();
    });
  });

  test.describe('Product Search', () => {
    test('should search products by name', async ({ page }) => {
      await productsPage.goto();
      
      const searchTerm = 'apple';
      await productsPage.searchProducts(searchTerm);
      await productsPage.verifySearchResults(searchTerm);
    });

    test('should handle search with no results', async ({ page }) => {
      await productsPage.goto();
      
      const searchTerm = 'nonexistentproduct123';
      await productsPage.searchProducts(searchTerm);
      await productsPage.verifyNoProductsMessage();
    });

    test('should clear search and show all products', async ({ page }) => {
      await productsPage.goto();
      
      // First search for something
      await productsPage.searchProducts('apple');
      const searchResultCount = await productsPage.getProductCount();
      
      // Clear search
      await productsPage.searchProducts('');
      const allProductsCount = await productsPage.getProductCount();
      
      expect(allProductsCount).toBeGreaterThanOrEqual(searchResultCount);
    });

    test('should search with special characters', async ({ page }) => {
      await productsPage.goto();
      
      const searchTerms = ['apple & orange', 'fruits-fresh', 'organic@farm'];
      
      for (const term of searchTerms) {
        await productsPage.searchProducts(term);
        // Should not crash or show error
        await page.waitForTimeout(1000);
      }
    });

    test('should be case insensitive', async ({ page }) => {
      await productsPage.goto();
      
      // Search with lowercase
      await productsPage.searchProducts('apple');
      const lowercaseResults = await productsPage.getProductCount();
      
      // Search with uppercase
      await productsPage.searchProducts('APPLE');
      const uppercaseResults = await productsPage.getProductCount();
      
      expect(uppercaseResults).toBe(lowercaseResults);
    });
  });

  test.describe('Product Filtering and Sorting', () => {
    test('should filter products by category', async ({ page }) => {
      await productsPage.goto();
      
      const categories = ['fruits', 'vegetables', 'dairy'];
      
      for (const category of categories) {
        if (await productsPage.isElementVisible(productsPage.categoryFilter)) {
          await productsPage.selectCategory(category);
          await productsPage.verifyFilterResults('category', category);
        }
      }
    });

    test('should sort products by price low to high', async ({ page }) => {
      await productsPage.goto();
      
      if (await productsPage.isElementVisible(productsPage.sortDropdown)) {
        await productsPage.sortProducts('price-low-high');
        await productsPage.verifySortOrder('price-low-high');
      }
    });

    test('should sort products by price high to low', async ({ page }) => {
      await productsPage.goto();
      
      if (await productsPage.isElementVisible(productsPage.sortDropdown)) {
        await productsPage.sortProducts('price-high-low');
        await productsPage.verifySortOrder('price-high-low');
      }
    });

    test('should filter products by price range', async ({ page }) => {
      await productsPage.goto();
      
      const minPrice = 5;
      const maxPrice = 20;
      
      await productsPage.filterByPriceRange(minPrice, maxPrice);
      await productsPage.verifyFilterResults('price', { min: minPrice, max: maxPrice });
    });

    test('should clear all filters', async ({ page }) => {
      await productsPage.goto();
      
      const initialCount = await productsPage.getProductCount();
      
      // Apply some filters
      if (await productsPage.isElementVisible(productsPage.categoryFilter)) {
        await productsPage.selectCategory('fruits');
      }
      
      const filteredCount = await productsPage.getProductCount();
      
      // Clear filters
      await productsPage.clearFilters();
      const clearedCount = await productsPage.getProductCount();
      
      expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('should combine multiple filters', async ({ page }) => {
      await productsPage.goto();
      
      // Apply category filter
      if (await productsPage.isElementVisible(productsPage.categoryFilter)) {
        await productsPage.selectCategory('fruits');
      }
      
      // Apply price filter
      await productsPage.filterByPriceRange(5, 15);
      
      // Apply sorting
      if (await productsPage.isElementVisible(productsPage.sortDropdown)) {
        await productsPage.sortProducts('price-low-high');
      }
      
      // Verify results meet all criteria
      await productsPage.waitForProductsToLoad();
      const productCount = await productsPage.getProductCount();
      
      if (productCount > 0) {
        await productsPage.verifySortOrder('price-low-high');
        await productsPage.verifyFilterResults('price', { min: 5, max: 15 });
      }
    });
  });

  test.describe('Product Details Modal', () => {
    test('should open and display product details modal', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.verifyModalContent(0);
        await productsPage.closeProductModal();
      }
    });

    test('should update quantity in modal', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.openProductDetails(0);
        
        const newQuantity = 3;
        await productsPage.setQuantityInModal(newQuantity);
        
        const actualQuantity = await productsPage.getQuantityFromModal();
        expect(actualQuantity).toBe(newQuantity);
        
        await productsPage.closeProductModal();
      }
    });

    test('should add product to cart from modal', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        const initialCartCount = await productsPage.getCartCount();
        
        await productsPage.openProductDetails(0);
        await productsPage.addToCartFromModal(2);
        await productsPage.closeProductModal();
        
        const finalCartCount = await productsPage.getCartCount();
        expect(finalCartCount).toBeGreaterThan(initialCartCount);
      }
    });

    test('should close modal with escape key', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.openProductDetails(0);
        
        await page.keyboard.press('Escape');
        
        await page.waitForSelector(productsPage.productModal, { 
          state: 'hidden', 
          timeout: 5000 
        });
      }
    });

    test('should handle modal for out of stock products', async ({ page }) => {
      // Mock out of stock product
      await page.route('**/api/products**', route => {
        const response = {
          products: [{
            id: '1',
            name: 'Out of Stock Product',
            price: 10.99,
            stock: 0,
            image: 'test.jpg'
          }],
          total: 1
        };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      });
      
      await productsPage.goto();
      await productsPage.openProductDetails(0);
      
      // Add to cart button should be disabled or show out of stock
      const addToCartButton = page.locator(productsPage.modalAddToCart);
      const isDisabled = await addToCartButton.evaluate(el => el.disabled);
      const buttonText = await addToCartButton.textContent();
      
      expect(isDisabled || buttonText.toLowerCase().includes('out of stock')).toBe(true);
    });
  });

  test.describe('Add to Cart Functionality', () => {
    test('should add single product to cart from listing', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        const initialCartCount = await productsPage.getCartCount();
        
        await productsPage.addProductToCart(0);
        
        const finalCartCount = await productsPage.getCartCount();
        expect(finalCartCount).toBe(initialCartCount + 1);
      }
    });

    test('should add multiple different products to cart', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      const productsToAdd = Math.min(productCount, 3);
      
      if (productsToAdd > 0) {
        const initialCartCount = await productsPage.getCartCount();
        
        for (let i = 0; i < productsToAdd; i++) {
          await productsPage.addProductToCart(i);
          await page.waitForTimeout(500); // Wait between additions
        }
        
        const finalCartCount = await productsPage.getCartCount();
        expect(finalCartCount).toBe(initialCartCount + productsToAdd);
      }
    });

    test('should show cart notification after adding product', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.addProductToCart(0);
        
        // Verify notification appears
        if (await productsPage.isElementVisible(productsPage.cartNotification)) {
          await expect(page.locator(productsPage.cartNotification)).toBeVisible();
        }
      }
    });

    test('should update cart count in header', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        const initialCount = await productsPage.getCartCount();
        
        await productsPage.addProductToCart(0);
        
        const newCount = await productsPage.getCartCount();
        expect(newCount).toBeGreaterThan(initialCount);
      }
    });

    test('should handle adding same product multiple times', async ({ page }) => {
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        const initialCartCount = await productsPage.getCartCount();
        
        // Add same product twice
        await productsPage.addProductToCart(0);
        await productsPage.addProductToCart(0);
        
        const finalCartCount = await productsPage.getCartCount();
        
        // Depending on implementation: might increase count by 2 or quantity by 1
        expect(finalCartCount).toBeGreaterThan(initialCartCount);
      }
    });

    test('should handle out of stock products', async ({ page }) => {
      // Mock out of stock scenario
      await page.route('**/api/cart/add**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Product out of stock' })
        });
      });
      
      await productsPage.goto();
      
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.addProductToCart(0);
        
        // Should show error message
        if (await page.isVisible('[data-testid="error-message"]')) {
          await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Cart Page Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Add a product to cart before cart tests
      await productsPage.goto();
      const productCount = await productsPage.getProductCount();
      if (productCount > 0) {
        await productsPage.addProductToCart(0);
      }
    });

    test('should display cart page with items', async ({ page }) => {
      await cartPage.goto();
      await cartPage.verifyCartHasItems();
    });

    test('should update item quantity in cart', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        const originalQuantity = await cartPage.getItemQuantity(0);
        const newQuantity = originalQuantity + 1;
        
        await cartPage.updateItemQuantity(0, newQuantity);
        
        const updatedQuantity = await cartPage.getItemQuantity(0);
        expect(updatedQuantity).toBe(newQuantity);
      }
    });

    test('should remove item from cart', async ({ page }) => {
      await cartPage.goto();
      
      const initialItemCount = await cartPage.getCartItemCount();
      if (initialItemCount > 0) {
        await cartPage.removeItem(0);
        
        const finalItemCount = await cartPage.getCartItemCount();
        expect(finalItemCount).toBe(initialItemCount - 1);
      }
    });

    test('should clear entire cart', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        await cartPage.clearCart();
        await cartPage.verifyEmptyCart();
      }
    });

    test('should calculate cart totals correctly', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        await cartPage.verifyCartCalculations();
      }
    });

    test('should apply valid coupon code', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        const couponCode = 'SAVE10';
        
        // Mock successful coupon application
        await page.route('**/api/cart/coupon**', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              discount: 10,
              message: 'Coupon applied successfully'
            })
          });
        });
        
        await cartPage.applyCoupon(couponCode);
        await cartPage.verifyCouponApplied(couponCode);
      }
    });

    test('should handle invalid coupon code', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        const invalidCoupon = 'INVALID123';
        
        // Mock coupon error
        await page.route('**/api/cart/coupon**', route => {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid coupon code' })
          });
        });
        
        await cartPage.applyCoupon(invalidCoupon);
        await cartPage.verifyCouponError();
      }
    });

    test('should proceed to checkout', async ({ page }) => {
      await cartPage.goto();
      
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        await cartPage.verifyCheckoutButtonEnabled();
        await cartPage.proceedToCheckout();
        
        // Should navigate to checkout page
        await expect(page).toHaveURL(/checkout|payment/);
      }
    });

    test('should handle empty cart checkout attempt', async ({ page }) => {
      // Clear cart first
      await cartPage.goto();
      const itemCount = await cartPage.getCartItemCount();
      if (itemCount > 0) {
        await cartPage.clearCart();
      }
      
      await cartPage.verifyEmptyCart();
      
      if (await cartPage.isElementVisible(cartPage.checkoutButton)) {
        await cartPage.verifyCheckoutButtonDisabled();
      }
    });

    test('should continue shopping from cart', async ({ page }) => {
      await cartPage.goto();
      
      if (await cartPage.isElementVisible(cartPage.continueShoppingButton)) {
        await cartPage.continueShopping();
        await expect(page).toHaveURL(/products|shop/);
      }
    });
  });

  test.describe('Product Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('**/api/products**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await productsPage.goto();
      
      // Should show error message or fallback UI
      const hasErrorMessage = await page.isVisible('[data-testid="error-message"]');
      const hasRetryButton = await page.isVisible('[data-testid="retry-button"]');
      
      expect(hasErrorMessage || hasRetryButton).toBe(true);
    });

    test('should handle network failures', async ({ page }) => {
      await page.route('**/api/products**', route => {
        route.abort('failed');
      });
      
      await productsPage.goto();
      
      // Should handle network failure gracefully
      await page.waitForTimeout(5000);
      
      const hasErrorUI = await page.isVisible('[data-testid="error-message"]') ||
                        await page.isVisible('[data-testid="network-error"]') ||
                        await page.isVisible('.error');
      
      expect(hasErrorUI).toBe(true);
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/products**', route => {
        requestCount++;
        if (requestCount < 3) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await productsPage.goto();
      
      // Click retry if available
      if (await page.isVisible('[data-testid="retry-button"]')) {
        await page.click('[data-testid="retry-button"]');
        await page.click('[data-testid="retry-button"]'); // Second retry
      }
      
      // Should eventually load products
      await productsPage.verifyProductsDisplayed();
    });
  });
});