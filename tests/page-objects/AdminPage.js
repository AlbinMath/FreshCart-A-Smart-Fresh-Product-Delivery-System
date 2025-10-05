// Admin Dashboard Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class AdminPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Navigation and layout
    this.adminSidebar = '[data-testid="admin-sidebar"], .admin-sidebar, .sidebar';
    this.adminHeader = '[data-testid="admin-header"], .admin-header, .header';
    this.adminContent = '[data-testid="admin-content"], .admin-content, .main-content';
    this.logoLink = '[data-testid="admin-logo"], .logo';
    this.userMenu = '[data-testid="admin-user-menu"], .user-menu, .profile-menu';
    this.logoutButton = '[data-testid="admin-logout"], .logout-btn';
    
    // Dashboard overview
    this.dashboardStats = '[data-testid="dashboard-stats"], .dashboard-stats, .stats-cards';
    this.totalUsersCard = '[data-testid="total-users"], .total-users-card';
    this.totalOrdersCard = '[data-testid="total-orders"], .total-orders-card';
    this.totalRevenueCard = '[data-testid="total-revenue"], .total-revenue-card';
    this.totalProductsCard = '[data-testid="total-products"], .total-products-card';
    this.recentOrdersTable = '[data-testid="recent-orders"], .recent-orders';
    this.chartContainer = '[data-testid="admin-charts"], .charts-container';
    
    // Navigation menu items
    this.dashboardLink = '[data-testid="nav-dashboard"], a[href*="dashboard"]';
    this.usersLink = '[data-testid="nav-users"], a[href*="users"]';
    this.ordersLink = '[data-testid="nav-orders"], a[href*="orders"]';
    this.productsLink = '[data-testid="nav-products"], a[href*="admin/products"]';
    this.sellersLink = '[data-testid="nav-sellers"], a[href*="sellers"]';
    this.deliveryLink = '[data-testid="nav-delivery"], a[href*="delivery"]';
    this.reportsLink = '[data-testid="nav-reports"], a[href*="reports"]';
    this.settingsLink = '[data-testid="nav-settings"], a[href*="settings"]';
    
    // User management
    this.usersTable = '[data-testid="users-table"], .users-table';
    this.userRow = '[data-testid="user-row"], .user-row, tbody tr';
    this.addUserButton = '[data-testid="add-user"], .add-user-btn';
    this.editUserButton = '[data-testid="edit-user"], .edit-user-btn';
    this.deleteUserButton = '[data-testid="delete-user"], .delete-user-btn';
    this.userSearchInput = '[data-testid="user-search"], input[placeholder*="search"]';
    this.userFilterDropdown = '[data-testid="user-filter"], .user-filter select';
    this.blockUserButton = '[data-testid="block-user"], .block-user-btn';
    this.unblockUserButton = '[data-testid="unblock-user"], .unblock-user-btn';
    
    // Order management
    this.ordersTable = '[data-testid="orders-table"], .orders-table';
    this.orderRow = '[data-testid="order-row"], .order-row, tbody tr';
    this.orderDetailsLink = '[data-testid="order-details"], .order-details-link';
    this.orderStatusDropdown = '[data-testid="order-status"], .order-status select';
    this.updateOrderButton = '[data-testid="update-order"], .update-order-btn';
    this.orderSearchInput = '[data-testid="order-search"], input[placeholder*="order"]';
    this.orderFilterDate = '[data-testid="order-date-filter"], input[type="date"]';
    this.orderFilterStatus = '[data-testid="order-filter-status"], .order-filter select';
    
    // Product management
    this.adminProductsTable = '[data-testid="admin-products-table"], .admin-products-table';
    this.productRow = '[data-testid="product-row"], .product-row, tbody tr';
    this.addProductButton = '[data-testid="add-product"], .add-product-btn';
    this.editProductButton = '[data-testid="edit-product"], .edit-product-btn';
    this.deleteProductButton = '[data-testid="delete-product"], .delete-product-btn';
    this.approveProductButton = '[data-testid="approve-product"], .approve-product-btn';
    this.rejectProductButton = '[data-testid="reject-product"], .reject-product-btn';
    this.productStatusBadge = '[data-testid="product-status"], .product-status';
    this.pendingProductsFilter = '[data-testid="pending-products"], .pending-filter';
    
    // Seller management
    this.sellersTable = '[data-testid="sellers-table"], .sellers-table';
    this.sellerRow = '[data-testid="seller-row"], .seller-row, tbody tr';
    this.approveLicenseButton = '[data-testid="approve-license"], .approve-license-btn';
    this.rejectLicenseButton = '[data-testid="reject-license"], .reject-license-btn';
    this.viewLicenseButton = '[data-testid="view-license"], .view-license-btn';
    this.licenseModal = '[data-testid="license-modal"], .license-modal';
    this.sellerStatusBadge = '[data-testid="seller-status"], .seller-status';
    
    // Forms and modals
    this.modal = '[data-testid="admin-modal"], .modal, .dialog';
    this.modalClose = '[data-testid="modal-close"], .modal-close, .close';
    this.modalSave = '[data-testid="modal-save"], .modal-save, .save-btn';
    this.modalCancel = '[data-testid="modal-cancel"], .modal-cancel, .cancel-btn';
    this.confirmDialog = '[data-testid="confirm-dialog"], .confirm-dialog';
    this.confirmYes = '[data-testid="confirm-yes"], .confirm-yes';
    this.confirmNo = '[data-testid="confirm-no"], .confirm-no';
    
    // Pagination and table controls
    this.pagination = '[data-testid="admin-pagination"], .pagination';
    this.nextPageButton = '[data-testid="next-page"], .pagination .next';
    this.prevPageButton = '[data-testid="prev-page"], .pagination .prev';
    this.pageInfo = '[data-testid="page-info"], .page-info';
    this.itemsPerPageSelect = '[data-testid="items-per-page"], .items-per-page select';
    
    // Search and filters
    this.globalSearch = '[data-testid="global-search"], .global-search input';
    this.filterButton = '[data-testid="filter-button"], .filter-btn';
    this.clearFiltersButton = '[data-testid="clear-filters"], .clear-filters';
    this.exportButton = '[data-testid="export-data"], .export-btn';
    
    // Notifications and alerts
    this.successAlert = '[data-testid="success-alert"], .alert-success, .success';
    this.errorAlert = '[data-testid="error-alert"], .alert-error, .error';
    this.warningAlert = '[data-testid="warning-alert"], .alert-warning, .warning';
    this.notificationToast = '[data-testid="notification-toast"], .toast';
  }

  async goto() {
    await super.goto('/admin/dashboard');
  }

  async gotoUsersPage() {
    await super.goto('/admin/users');
  }

  async gotoOrdersPage() {
    await super.goto('/admin/orders');
  }

  async gotoProductsPage() {
    await super.goto('/admin/products');
  }

  async gotoSellersPage() {
    await super.goto('/admin/sellers');
  }

  // Navigation methods
  async navigateToSection(section) {
    const sectionMap = {
      'dashboard': this.dashboardLink,
      'users': this.usersLink,
      'orders': this.ordersLink,
      'products': this.productsLink,
      'sellers': this.sellersLink,
      'delivery': this.deliveryLink,
      'reports': this.reportsLink,
      'settings': this.settingsLink
    };
    
    const linkSelector = sectionMap[section];
    if (linkSelector && await this.isElementVisible(linkSelector)) {
      await this.clickElement(linkSelector);
      await this.waitForPageLoad();
    }
  }

  // Dashboard methods
  async getDashboardStats() {
    const stats = {};
    
    if (await this.isElementVisible(this.totalUsersCard)) {
      stats.users = await this.getTextContent(`${this.totalUsersCard} .stat-number`);
    }
    if (await this.isElementVisible(this.totalOrdersCard)) {
      stats.orders = await this.getTextContent(`${this.totalOrdersCard} .stat-number`);
    }
    if (await this.isElementVisible(this.totalRevenueCard)) {
      stats.revenue = await this.getTextContent(`${this.totalRevenueCard} .stat-number`);
    }
    if (await this.isElementVisible(this.totalProductsCard)) {
      stats.products = await this.getTextContent(`${this.totalProductsCard} .stat-number`);
    }
    
    return stats;
  }

  async verifyDashboardElements() {
    await expect(this.page.locator(this.adminSidebar)).toBeVisible();
    await expect(this.page.locator(this.adminHeader)).toBeVisible();
    await expect(this.page.locator(this.adminContent)).toBeVisible();
    
    if (await this.isElementVisible(this.dashboardStats)) {
      await expect(this.page.locator(this.dashboardStats)).toBeVisible();
    }
  }

  // User management methods
  async searchUsers(searchTerm) {
    if (await this.isElementVisible(this.userSearchInput)) {
      await this.fillField(this.userSearchInput, searchTerm);
      await this.page.keyboard.press('Enter');
      await this.waitForTableUpdate();
    }
  }

  async filterUsers(filterType, filterValue) {
    if (await this.isElementVisible(this.userFilterDropdown)) {
      await this.page.selectOption(this.userFilterDropdown, filterValue);
      await this.waitForTableUpdate();
    }
  }

  async getUsersCount() {
    await this.waitForElement(this.userRow);
    return await this.page.locator(this.userRow).count();
  }

  async getUserByIndex(index) {
    const users = this.page.locator(this.userRow);
    return users.nth(index);
  }

  async editUser(userIndex) {
    const user = await this.getUserByIndex(userIndex);
    await user.locator(this.editUserButton).click();
    await this.waitForElement(this.modal);
  }

  async deleteUser(userIndex) {
    const user = await this.getUserByIndex(userIndex);
    await user.locator(this.deleteUserButton).click();
    
    // Handle confirmation dialog
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async blockUser(userIndex) {
    const user = await this.getUserByIndex(userIndex);
    await user.locator(this.blockUserButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async unblockUser(userIndex) {
    const user = await this.getUserByIndex(userIndex);
    await user.locator(this.unblockUserButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  // Order management methods
  async searchOrders(searchTerm) {
    if (await this.isElementVisible(this.orderSearchInput)) {
      await this.fillField(this.orderSearchInput, searchTerm);
      await this.page.keyboard.press('Enter');
      await this.waitForTableUpdate();
    }
  }

  async filterOrdersByStatus(status) {
    if (await this.isElementVisible(this.orderFilterStatus)) {
      await this.page.selectOption(this.orderFilterStatus, status);
      await this.waitForTableUpdate();
    }
  }

  async filterOrdersByDate(fromDate, toDate = null) {
    const dateFilters = this.page.locator(this.orderFilterDate);
    
    if (await dateFilters.first().isVisible()) {
      await dateFilters.first().fill(fromDate);
    }
    
    if (toDate && await dateFilters.nth(1).isVisible()) {
      await dateFilters.nth(1).fill(toDate);
    }
    
    await this.waitForTableUpdate();
  }

  async getOrdersCount() {
    if (await this.isElementVisible(this.orderRow)) {
      return await this.page.locator(this.orderRow).count();
    }
    return 0;
  }

  async getOrderByIndex(index) {
    const orders = this.page.locator(this.orderRow);
    return orders.nth(index);
  }

  async updateOrderStatus(orderIndex, newStatus) {
    const order = await this.getOrderByIndex(orderIndex);
    await order.locator(this.orderStatusDropdown).selectOption(newStatus);
    
    if (await order.locator(this.updateOrderButton).isVisible()) {
      await order.locator(this.updateOrderButton).click();
    }
    
    await this.waitForTableUpdate();
  }

  async viewOrderDetails(orderIndex) {
    const order = await this.getOrderByIndex(orderIndex);
    await order.locator(this.orderDetailsLink).click();
    await this.waitForPageLoad();
  }

  // Product management methods
  async getProductsCount() {
    if (await this.isElementVisible(this.productRow)) {
      return await this.page.locator(this.productRow).count();
    }
    return 0;
  }

  async getProductByIndex(index) {
    const products = this.page.locator(this.productRow);
    return products.nth(index);
  }

  async approveProduct(productIndex) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.approveProductButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async rejectProduct(productIndex) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.rejectProductButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async editProduct(productIndex) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.editProductButton).click();
    await this.waitForElement(this.modal);
  }

  async deleteProduct(productIndex) {
    const product = await this.getProductByIndex(productIndex);
    await product.locator(this.deleteProductButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async filterPendingProducts() {
    if (await this.isElementVisible(this.pendingProductsFilter)) {
      await this.clickElement(this.pendingProductsFilter);
      await this.waitForTableUpdate();
    }
  }

  // Seller management methods
  async getSellersCount() {
    if (await this.isElementVisible(this.sellerRow)) {
      return await this.page.locator(this.sellerRow).count();
    }
    return 0;
  }

  async getSellerByIndex(index) {
    const sellers = this.page.locator(this.sellerRow);
    return sellers.nth(index);
  }

  async approveLicense(sellerIndex) {
    const seller = await this.getSellerByIndex(sellerIndex);
    await seller.locator(this.approveLicenseButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async rejectLicense(sellerIndex) {
    const seller = await this.getSellerByIndex(sellerIndex);
    await seller.locator(this.rejectLicenseButton).click();
    
    if (await this.isElementVisible(this.confirmDialog)) {
      await this.clickElement(this.confirmYes);
    }
    
    await this.waitForTableUpdate();
  }

  async viewLicense(sellerIndex) {
    const seller = await this.getSellerByIndex(sellerIndex);
    await seller.locator(this.viewLicenseButton).click();
    await this.waitForElement(this.licenseModal);
  }

  async closeLicenseModal() {
    await this.clickElement(this.modalClose);
    await this.page.waitForSelector(this.licenseModal, { state: 'hidden' });
  }

  // General utility methods
  async waitForTableUpdate() {
    await this.page.waitForTimeout(1000); // Wait for any animations/updates
    await this.waitForPageLoad();
  }

  async closeModal() {
    await this.clickElement(this.modalClose);
    await this.page.waitForSelector(this.modal, { state: 'hidden' });
  }

  async saveModal() {
    await this.clickElement(this.modalSave);
    await this.waitForTableUpdate();
  }

  async cancelModal() {
    await this.clickElement(this.modalCancel);
    await this.page.waitForSelector(this.modal, { state: 'hidden' });
  }

  async navigateToNextPage() {
    if (await this.isElementVisible(this.nextPageButton)) {
      await this.clickElement(this.nextPageButton);
      await this.waitForTableUpdate();
    }
  }

  async navigateToPrevPage() {
    if (await this.isElementVisible(this.prevPageButton)) {
      await this.clickElement(this.prevPageButton);
      await this.waitForTableUpdate();
    }
  }

  async exportData() {
    if (await this.isElementVisible(this.exportButton)) {
      await this.clickElement(this.exportButton);
      // Handle download if needed
    }
  }

  async clearFilters() {
    if (await this.isElementVisible(this.clearFiltersButton)) {
      await this.clickElement(this.clearFiltersButton);
      await this.waitForTableUpdate();
    }
  }

  async logout() {
    await this.clickElement(this.userMenu);
    await this.clickElement(this.logoutButton);
    await this.page.waitForURL(/login/, { timeout: 10000 });
  }

  // Verification methods
  async verifySuccessMessage(message = null) {
    await expect(this.page.locator(this.successAlert)).toBeVisible();
    
    if (message) {
      const alertText = await this.getTextContent(this.successAlert);
      expect(alertText.toLowerCase()).toContain(message.toLowerCase());
    }
  }

  async verifyErrorMessage(message = null) {
    await expect(this.page.locator(this.errorAlert)).toBeVisible();
    
    if (message) {
      const alertText = await this.getTextContent(this.errorAlert);
      expect(alertText.toLowerCase()).toContain(message.toLowerCase());
    }
  }

  async verifyTableNotEmpty(tableSelector) {
    const rowCount = await this.page.locator(`${tableSelector} tbody tr`).count();
    expect(rowCount).toBeGreaterThan(0);
  }

  async verifyTableEmpty(tableSelector) {
    const hasEmptyMessage = await this.isElementVisible('[data-testid="empty-table"]');
    const rowCount = await this.page.locator(`${tableSelector} tbody tr`).count();
    
    expect(hasEmptyMessage || rowCount === 0).toBe(true);
  }

  async verifyAdminAccess() {
    await this.verifyDashboardElements();
    await expect(this.page).toHaveURL(/admin/);
  }
}

module.exports = AdminPage;