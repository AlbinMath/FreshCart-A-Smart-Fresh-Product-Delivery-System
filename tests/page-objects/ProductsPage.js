// Products Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class ProductsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Product listing selectors
    this.productGrid = '[data-testid="products-grid"], .products-grid, .product-list';
    this.productCard = '[data-testid="product-card"], .product-card, .product-item';
    this.productImage = '[data-testid="product-image"], .product-image img';
    this.productName = '[data-testid="product-name"], .product-name, .product-title';
    this.productPrice = '[data-testid="product-price"], .product-price, .price';
    this.productRating = '[data-testid="product-rating"], .product-rating, .rating';
    this.addToCartButton = '[data-testid="add-to-cart"], .add-to-cart, button:has-text("Add to Cart")';
    
    // Search and filters
    this.searchInput = '[data-testid="search-input"], input[placeholder*="search"], .search-input';
    this.searchButton = '[data-testid="search-button"], .search-btn, button:has-text("Search")';
    this.categoryFilter = '[data-testid="category-filter"], .category-filter select';
    this.priceFilter = '[data-testid="price-filter"], .price-filter';
    this.sortDropdown = '[data-testid="sort-dropdown"], .sort-dropdown select';
    this.filterButton = '[data-testid="filter-button"], .filter-btn';
    this.clearFiltersButton = '[data-testid="clear-filters"], .clear-filters';
    
    // Product details
    this.productModal = '[data-testid="product-modal"], .product-modal, .modal';
    this.modalImage = '[data-testid="modal-image"], .modal .product-image img';
    this.modalName = '[data-testid="modal-name"], .modal .product-name';
    this.modalPrice = '[data-testid="modal-price"], .modal .product-price';
    this.modalDescription = '[data-testid="modal-description"], .modal .description';
    this.modalAddToCart = '[data-testid="modal-add-cart"], .modal .add-to-cart';
    this.quantityInput = '[data-testid="quantity-input"], input[name="quantity"]';
    this.increaseQuantity = '[data-testid="increase-qty"], .qty-increase, button:has-text("+")';
    this.decreaseQuantity = '[data-testid="decrease-qty"], .qty-decrease, button:has-text("-")';
    this.closeModal = '[data-testid="close-modal"], .modal .close, .modal-close';
    
    // Categories
    this.categoryMenu = '[data-testid="category-menu"], .category-menu, .categories';
    this.categoryItem = '[data-testid="category-item"], .category-item';
    
    // Pagination
    this.pagination = '[data-testid="pagination"], .pagination';
    this.nextPage = '[data-testid="next-page"], .pagination .next';
    this.prevPage = '[data-testid="prev-page"], .pagination .prev';
    this.pageNumber = '[data-testid="page-number"], .pagination .page-number';
    
    // Loading and empty states
    this.loadingSpinner = '[data-testid="loading"], .loading, .spinner';
    this.noProductsMessage = '[data-testid="no-products"], .no-products, .empty-state';
    
    // Cart notification
    this.cartNotification = '[data-testid="cart-notification"], .cart-notification, .toast';
    this.cartCount = '[data-testid="cart-count"], .cart-count, .badge';
  }

  async goto() {
    await super.goto('/products');
  }

  async searchProducts(searchTerm) {
    await this.fillField(this.searchInput, searchTerm);
    
    if (await this.isElementVisible(this.searchButton)) {
      await this.clickElement(this.searchButton);
    } else {
      await this.page.keyboard.press('Enter');
    }
    
    await this.waitForProductsToLoad();
  }

  async selectCategory(categoryName) {
    if (await this.isElementVisible(this.categoryFilter)) {
      await this.page.selectOption(this.categoryFilter, categoryName);
    } else {
      // Click on category menu item
      await this.page.getByText(categoryName).click();
    }
    
    await this.waitForProductsToLoad();
  }

  async sortProducts(sortOption) {
    await this.page.selectOption(this.sortDropdown, sortOption);
    await this.waitForProductsToLoad();
  }

  async filterByPriceRange(minPrice, maxPrice) {
    if (await this.isElementVisible('[data-testid="min-price"]')) {
      await this.fillField('[data-testid="min-price"]', minPrice.toString());
    }
    if (await this.isElementVisible('[data-testid="max-price"]')) {
      await this.fillField('[data-testid="max-price"]', maxPrice.toString());
    }
    
    if (await this.isElementVisible(this.filterButton)) {
      await this.clickElement(this.filterButton);
    }
    
    await this.waitForProductsToLoad();
  }

  async clearFilters() {
    if (await this.isElementVisible(this.clearFiltersButton)) {
      await this.clickElement(this.clearFiltersButton);
      await this.waitForProductsToLoad();
    }
  }

  async getProductCount() {
    await this.waitForElement(this.productCard);
    return await this.page.locator(this.productCard).count();
  }

  async getProductByIndex(index) {
    const products = this.page.locator(this.productCard);
    return products.nth(index);
  }

  async getProductByName(productName) {
    return this.page.locator(this.productCard).filter({ hasText: productName });
  }

  async addProductToCart(productIndex = 0) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.addToCartButton).click();
    
    // Wait for cart notification or update
    await this.waitForCartUpdate();
  }

  async addProductToCartByName(productName) {
    const product = await this.getProductByName(productName);
    await product.locator(this.addToCartButton).click();
    await this.waitForCartUpdate();
  }

  async openProductDetails(productIndex = 0) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.productImage).click();
    
    await this.waitForElement(this.productModal);
  }

  async closeProductModal() {
    await this.clickElement(this.closeModal);
    await this.page.waitForSelector(this.productModal, { state: 'hidden' });
  }

  async setQuantityInModal(quantity) {
    if (await this.isElementVisible(this.quantityInput)) {
      await this.fillField(this.quantityInput, quantity.toString());
    } else {
      // Use increase/decrease buttons
      const currentQty = await this.getQuantityFromModal();
      const difference = quantity - currentQty;
      
      if (difference > 0) {
        for (let i = 0; i < difference; i++) {
          await this.clickElement(this.increaseQuantity);
        }
      } else if (difference < 0) {
        for (let i = 0; i < Math.abs(difference); i++) {
          await this.clickElement(this.decreaseQuantity);
        }
      }
    }
  }

  async getQuantityFromModal() {
    if (await this.isElementVisible(this.quantityInput)) {
      return parseInt(await this.page.locator(this.quantityInput).inputValue());
    }
    return 1; // Default quantity
  }

  async addToCartFromModal(quantity = 1) {
    await this.setQuantityInModal(quantity);
    await this.clickElement(this.modalAddToCart);
    await this.waitForCartUpdate();
  }

  async waitForProductsToLoad() {
    // Wait for loading to disappear
    if (await this.isElementVisible(this.loadingSpinner)) {
      await this.page.waitForSelector(this.loadingSpinner, { state: 'hidden', timeout: 10000 });
    }
    
    // Wait for products to appear
    try {
      await this.waitForElement(this.productCard);
    } catch {
      // Check if no products message is shown
      await this.isElementVisible(this.noProductsMessage);
    }
  }

  async waitForCartUpdate() {
    try {
      await this.page.waitForSelector(this.cartNotification, { state: 'visible', timeout: 5000 });
      await this.page.waitForTimeout(1000); // Wait for animation
    } catch {
      // No notification, just wait a bit
      await this.page.waitForTimeout(500);
    }
  }

  async getCartCount() {
    if (await this.isElementVisible(this.cartCount)) {
      const countText = await this.getTextContent(this.cartCount);
      return parseInt(countText) || 0;
    }
    return 0;
  }

  async navigateToNextPage() {
    if (await this.isElementVisible(this.nextPage)) {
      await this.clickElement(this.nextPage);
      await this.waitForProductsToLoad();
    }
  }

  async navigateToPrevPage() {
    if (await this.isElementVisible(this.prevPage)) {
      await this.clickElement(this.prevPage);
      await this.waitForProductsToLoad();
    }
  }

  async navigateToPage(pageNumber) {
    const pageLink = this.page.locator(this.pageNumber).filter({ hasText: pageNumber.toString() });
    if (await pageLink.isVisible()) {
      await pageLink.click();
      await this.waitForProductsToLoad();
    }
  }

  async verifyProductsDisplayed() {
    await expect(this.page.locator(this.productGrid)).toBeVisible();
    
    const productCount = await this.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  }

  async verifyNoProductsMessage() {
    await expect(this.page.locator(this.noProductsMessage)).toBeVisible();
  }

  async verifyProductDetails(productIndex = 0) {
    const product = await this.getProductByIndex(productIndex);
    
    await expect(product.locator(this.productImage)).toBeVisible();
    await expect(product.locator(this.productName)).toBeVisible();
    await expect(product.locator(this.productPrice)).toBeVisible();
    await expect(product.locator(this.addToCartButton)).toBeVisible();
  }

  async verifySearchResults(searchTerm) {
    await this.waitForProductsToLoad();
    
    const productCount = await this.getProductCount();
    if (productCount > 0) {
      // Verify at least one product contains the search term
      const productNames = await this.page.locator(this.productName).allTextContents();
      const hasMatchingProduct = productNames.some(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(hasMatchingProduct).toBe(true);
    } else {
      await this.verifyNoProductsMessage();
    }
  }

  async verifySortOrder(sortType) {
    await this.waitForProductsToLoad();
    
    const prices = await this.page.locator(this.productPrice).allTextContents();
    const numericPrices = prices.map(price => parseFloat(price.replace(/[^0-9.]/g, '')));
    
    if (sortType === 'price-low-high') {
      const sortedPrices = [...numericPrices].sort((a, b) => a - b);
      expect(numericPrices).toEqual(sortedPrices);
    } else if (sortType === 'price-high-low') {
      const sortedPrices = [...numericPrices].sort((a, b) => b - a);
      expect(numericPrices).toEqual(sortedPrices);
    }
  }

  async verifyFilterResults(filterType, filterValue) {
    await this.waitForProductsToLoad();
    
    const productCount = await this.getProductCount();
    if (productCount > 0) {
      if (filterType === 'category') {
        // Verify products belong to selected category
        // This would need category information in the product cards
      } else if (filterType === 'price') {
        const prices = await this.page.locator(this.productPrice).allTextContents();
        const numericPrices = prices.map(price => parseFloat(price.replace(/[^0-9.]/g, '')));
        
        if (filterValue.min !== undefined) {
          expect(Math.min(...numericPrices)).toBeGreaterThanOrEqual(filterValue.min);
        }
        if (filterValue.max !== undefined) {
          expect(Math.max(...numericPrices)).toBeLessThanOrEqual(filterValue.max);
        }
      }
    }
  }

  async verifyModalContent(productIndex = 0) {
    await this.openProductDetails(productIndex);
    
    await expect(this.page.locator(this.modalImage)).toBeVisible();
    await expect(this.page.locator(this.modalName)).toBeVisible();
    await expect(this.page.locator(this.modalPrice)).toBeVisible();
    await expect(this.page.locator(this.modalAddToCart)).toBeVisible();
    
    if (await this.isElementVisible(this.modalDescription)) {
      await expect(this.page.locator(this.modalDescription)).toBeVisible();
    }
  }
}

module.exports = ProductsPage;