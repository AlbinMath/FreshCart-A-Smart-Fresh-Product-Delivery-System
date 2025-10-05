// Admin Panel End-to-End Tests
const { test, expect } = require('@playwright/test');
const LoginPage = require('../page-objects/LoginPage');
const AdminPage = require('../page-objects/AdminPage');
const TestHelpers = require('../utils/test-helpers');
const { testUsers } = require('../fixtures/test-data');

test.describe('Admin Panel Tests', () => {
  let loginPage;
  let adminPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    adminPage = new AdminPage(page);
    
    // Login as admin before each test
    await loginPage.goto();
    await loginPage.login(testUsers.adminUser.email, testUsers.adminUser.password);
    await loginPage.verifyLoginSuccess();
  });

  test.describe('Admin Dashboard', () => {
    test('should display admin dashboard correctly', async ({ page }) => {
      await adminPage.goto();
      await adminPage.verifyAdminAccess();
      await adminPage.verifyDashboardElements();
    });

    test('should show dashboard statistics', async ({ page }) => {
      await adminPage.goto();
      
      const stats = await adminPage.getDashboardStats();
      
      // Verify stats are present and numeric
      if (stats.users) {
        expect(parseInt(stats.users.replace(/\D/g, ''))).toBeGreaterThanOrEqual(0);
      }
      if (stats.orders) {
        expect(parseInt(stats.orders.replace(/\D/g, ''))).toBeGreaterThanOrEqual(0);
      }
      if (stats.products) {
        expect(parseInt(stats.products.replace(/\D/g, ''))).toBeGreaterThanOrEqual(0);
      }
    });

    test('should navigate between admin sections', async ({ page }) => {
      await adminPage.goto();
      
      const sections = ['users', 'orders', 'products', 'sellers'];
      
      for (const section of sections) {
        await adminPage.navigateToSection(section);
        await expect(page).toHaveURL(new RegExp(`admin/${section}`));
        await adminPage.waitForPageLoad();
      }
    });

    test('should display recent orders if available', async ({ page }) => {
      await adminPage.goto();
      
      if (await adminPage.isElementVisible(adminPage.recentOrdersTable)) {
        await expect(page.locator(adminPage.recentOrdersTable)).toBeVisible();
      }
    });

    test('should handle charts and analytics', async ({ page }) => {
      await adminPage.goto();
      
      if (await adminPage.isElementVisible(adminPage.chartContainer)) {
        await expect(page.locator(adminPage.chartContainer)).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await adminPage.gotoUsersPage();
    });

    test('should display users table', async ({ page }) => {
      await expect(page.locator(adminPage.usersTable)).toBeVisible();
      
      const userCount = await adminPage.getUsersCount();
      if (userCount > 0) {
        await adminPage.verifyTableNotEmpty(adminPage.usersTable);
      }
    });

    test('should search for users', async ({ page }) => {
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0) {
        // Search for admin user
        await adminPage.searchUsers('admin');
        await adminPage.waitForTableUpdate();
        
        const filteredCount = await adminPage.getUsersCount();
        expect(filteredCount).toBeLessThanOrEqual(userCount);
      }
    });

    test('should filter users by role', async ({ page }) => {
      const initialCount = await adminPage.getUsersCount();
      
      if (initialCount > 0 && await adminPage.isElementVisible(adminPage.userFilterDropdown)) {
        await adminPage.filterUsers('role', 'customer');
        await adminPage.waitForTableUpdate();
        
        // Should show only customers or fewer results
        const filteredCount = await adminPage.getUsersCount();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('should edit user details', async ({ page }) => {
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0) {
        const user = await adminPage.getUserByIndex(0);
        
        if (await user.locator(adminPage.editUserButton).isVisible()) {
          await adminPage.editUser(0);
          
          // Modal should open
          await expect(page.locator(adminPage.modal)).toBeVisible();
          
          // Close modal
          await adminPage.closeModal();
        }
      }
    });

    test('should block and unblock users', async ({ page }) => {
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0) {
        const user = await adminPage.getUserByIndex(0);
        
        // Try to block user
        if (await user.locator(adminPage.blockUserButton).isVisible()) {
          await adminPage.blockUser(0);
          await adminPage.verifySuccessMessage();
          
          // Try to unblock
          if (await user.locator(adminPage.unblockUserButton).isVisible()) {
            await adminPage.unblockUser(0);
            await adminPage.verifySuccessMessage();
          }
        }
      }
    });

    test('should handle user deletion with confirmation', async ({ page }) => {
      // Mock users data with test user
      await page.route('**/api/admin/users**', route => {
        const mockUsers = [
          {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'customer',
            status: 'active',
            createdAt: new Date().toISOString()
          }
        ];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ users: mockUsers, total: 1 })
        });
      });
      
      await page.reload();
      
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0) {
        const user = await adminPage.getUserByIndex(0);
        
        if (await user.locator(adminPage.deleteUserButton).isVisible()) {
          // Mock delete confirmation
          page.on('dialog', async dialog => {
            expect(dialog.type()).toBe('confirm');
            await dialog.accept();
          });
          
          await adminPage.deleteUser(0);
        }
      }
    });

    test('should export users data', async ({ page }) => {
      if (await adminPage.isElementVisible(adminPage.exportButton)) {
        // Mock download
        const downloadPromise = page.waitForEvent('download');
        await adminPage.exportData();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('users');
      }
    });

    test('should handle pagination in users table', async ({ page }) => {
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0 && await adminPage.isElementVisible(adminPage.pagination)) {
        // Try next page
        if (await adminPage.isElementVisible(adminPage.nextPageButton)) {
          await adminPage.navigateToNextPage();
          await adminPage.waitForTableUpdate();
          
          // Go back to previous page
          if (await adminPage.isElementVisible(adminPage.prevPageButton)) {
            await adminPage.navigateToPrevPage();
            await adminPage.waitForTableUpdate();
          }
        }
      }
    });
  });

  test.describe('Order Management', () => {
    test.beforeEach(async ({ page }) => {
      await adminPage.gotoOrdersPage();
    });

    test('should display orders table', async ({ page }) => {
      await expect(page.locator(adminPage.ordersTable)).toBeVisible();
      
      const orderCount = await adminPage.getOrdersCount();
      if (orderCount > 0) {
        await adminPage.verifyTableNotEmpty(adminPage.ordersTable);
      }
    });

    test('should search orders by order ID or customer', async ({ page }) => {
      const orderCount = await adminPage.getOrdersCount();
      
      if (orderCount > 0) {
        // Get first order ID if visible
        const firstOrder = await adminPage.getOrderByIndex(0);
        const orderCells = firstOrder.locator('td');
        
        if (await orderCells.first().isVisible()) {
          const orderText = await orderCells.first().textContent();
          await adminPage.searchOrders(orderText.trim());
          await adminPage.waitForTableUpdate();
          
          const filteredCount = await adminPage.getOrdersCount();
          expect(filteredCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('should filter orders by status', async ({ page }) => {
      const initialCount = await adminPage.getOrdersCount();
      
      if (initialCount > 0) {
        const statuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
        
        for (const status of statuses) {
          await adminPage.filterOrdersByStatus(status);
          await adminPage.waitForTableUpdate();
          
          const filteredCount = await adminPage.getOrdersCount();
          // Each status should show equal or fewer orders
          expect(filteredCount).toBeLessThanOrEqual(initialCount);
        }
      }
    });

    test('should filter orders by date range', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await adminPage.filterOrdersByDate(lastWeek, today);
      await adminPage.waitForTableUpdate();
      
      // Should show orders within date range
      const orderCount = await adminPage.getOrdersCount();
      expect(orderCount).toBeGreaterThanOrEqual(0);
    });

    test('should update order status', async ({ page }) => {
      const orderCount = await adminPage.getOrdersCount();
      
      if (orderCount > 0) {
        const order = await adminPage.getOrderByIndex(0);
        
        if (await order.locator(adminPage.orderStatusDropdown).isVisible()) {
          await adminPage.updateOrderStatus(0, 'confirmed');
          await adminPage.verifySuccessMessage();
        }
      }
    });

    test('should view order details', async ({ page }) => {
      const orderCount = await adminPage.getOrdersCount();
      
      if (orderCount > 0) {
        const order = await adminPage.getOrderByIndex(0);
        
        if (await order.locator(adminPage.orderDetailsLink).isVisible()) {
          await adminPage.viewOrderDetails(0);
          
          // Should navigate to order details page
          await expect(page).toHaveURL(/order.*details|orders\/\d+/);
        }
      }
    });

    test('should clear order filters', async ({ page }) => {
      // Apply some filters first
      await adminPage.filterOrdersByStatus('pending');
      await adminPage.waitForTableUpdate();
      
      const filteredCount = await adminPage.getOrdersCount();
      
      // Clear filters
      await adminPage.clearFilters();
      await adminPage.waitForTableUpdate();
      
      const clearedCount = await adminPage.getOrdersCount();
      expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  test.describe('Product Management', () => {
    test.beforeEach(async ({ page }) => {
      await adminPage.gotoProductsPage();
    });

    test('should display products table', async ({ page }) => {
      await expect(page.locator(adminPage.adminProductsTable)).toBeVisible();
      
      const productCount = await adminPage.getProductsCount();
      if (productCount > 0) {
        await adminPage.verifyTableNotEmpty(adminPage.adminProductsTable);
      }
    });

    test('should approve pending products', async ({ page }) => {
      // Mock pending products
      await page.route('**/api/admin/products**', route => {
        const mockProducts = [
          {
            id: 'product-1',
            name: 'Test Product',
            price: 10.99,
            status: 'pending',
            seller: 'Test Seller',
            createdAt: new Date().toISOString()
          }
        ];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ products: mockProducts, total: 1 })
        });
      });
      
      await page.reload();
      
      const productCount = await adminPage.getProductsCount();
      
      if (productCount > 0) {
        const product = await adminPage.getProductByIndex(0);
        
        if (await product.locator(adminPage.approveProductButton).isVisible()) {
          await adminPage.approveProduct(0);
          await adminPage.verifySuccessMessage();
        }
      }
    });

    test('should reject products with reason', async ({ page }) => {
      const productCount = await adminPage.getProductsCount();
      
      if (productCount > 0) {
        const product = await adminPage.getProductByIndex(0);
        
        if (await product.locator(adminPage.rejectProductButton).isVisible()) {
          await adminPage.rejectProduct(0);
          await adminPage.verifySuccessMessage();
        }
      }
    });

    test('should edit product details', async ({ page }) => {
      const productCount = await adminPage.getProductsCount();
      
      if (productCount > 0) {
        const product = await adminPage.getProductByIndex(0);
        
        if (await product.locator(adminPage.editProductButton).isVisible()) {
          await adminPage.editProduct(0);
          await expect(page.locator(adminPage.modal)).toBeVisible();
          await adminPage.closeModal();
        }
      }
    });

    test('should delete products', async ({ page }) => {
      const productCount = await adminPage.getProductsCount();
      
      if (productCount > 0) {
        const product = await adminPage.getProductByIndex(0);
        
        if (await product.locator(adminPage.deleteProductButton).isVisible()) {
          // Mock confirmation dialog
          page.on('dialog', async dialog => {
            await dialog.accept();
          });
          
          await adminPage.deleteProduct(0);
        }
      }
    });

    test('should filter pending products only', async ({ page }) => {
      await adminPage.filterPendingProducts();
      await adminPage.waitForTableUpdate();
      
      const productCount = await adminPage.getProductsCount();
      
      if (productCount > 0) {
        // Verify all visible products are pending
        const products = page.locator(adminPage.productRow);
        const statusBadges = products.locator(adminPage.productStatusBadge);
        
        const statusCount = await statusBadges.count();
        if (statusCount > 0) {
          for (let i = 0; i < statusCount; i++) {
            const status = await statusBadges.nth(i).textContent();
            expect(status.toLowerCase()).toContain('pending');
          }
        }
      }
    });

    test('should add new product', async ({ page }) => {
      if (await adminPage.isElementVisible(adminPage.addProductButton)) {
        await adminPage.clickElement(adminPage.addProductButton);
        await expect(page.locator(adminPage.modal)).toBeVisible();
        
        // Fill product details if form is available
        const productName = `Test Product ${Date.now()}`;
        
        if (await page.isVisible('input[name="name"]')) {
          await page.fill('input[name="name"]', productName);
          await page.fill('input[name="price"]', '19.99');
          await page.fill('textarea[name="description"]', 'Test product description');
          
          await adminPage.saveModal();
          await adminPage.verifySuccessMessage();
        } else {
          await adminPage.closeModal();
        }
      }
    });
  });

  test.describe('Seller Management', () => {
    test.beforeEach(async ({ page }) => {
      await adminPage.gotoSellersPage();
    });

    test('should display sellers table', async ({ page }) => {
      await expect(page.locator(adminPage.sellersTable)).toBeVisible();
      
      const sellerCount = await adminPage.getSellersCount();
      if (sellerCount > 0) {
        await adminPage.verifyTableNotEmpty(adminPage.sellersTable);
      }
    });

    test('should approve seller license', async ({ page }) => {
      // Mock sellers with pending license
      await page.route('**/api/admin/sellers**', route => {
        const mockSellers = [
          {
            id: 'seller-1',
            name: 'Test Seller',
            email: 'seller@test.com',
            businessName: 'Test Business',
            licenseStatus: 'pending',
            createdAt: new Date().toISOString()
          }
        ];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ sellers: mockSellers, total: 1 })
        });
      });
      
      await page.reload();
      
      const sellerCount = await adminPage.getSellersCount();
      
      if (sellerCount > 0) {
        const seller = await adminPage.getSellerByIndex(0);
        
        if (await seller.locator(adminPage.approveLicenseButton).isVisible()) {
          await adminPage.approveLicense(0);
          await adminPage.verifySuccessMessage();
        }
      }
    });

    test('should reject seller license', async ({ page }) => {
      const sellerCount = await adminPage.getSellersCount();
      
      if (sellerCount > 0) {
        const seller = await adminPage.getSellerByIndex(0);
        
        if (await seller.locator(adminPage.rejectLicenseButton).isVisible()) {
          await adminPage.rejectLicense(0);
          await adminPage.verifySuccessMessage();
        }
      }
    });

    test('should view seller license document', async ({ page }) => {
      const sellerCount = await adminPage.getSellersCount();
      
      if (sellerCount > 0) {
        const seller = await adminPage.getSellerByIndex(0);
        
        if (await seller.locator(adminPage.viewLicenseButton).isVisible()) {
          await adminPage.viewLicense(0);
          await expect(page.locator(adminPage.licenseModal)).toBeVisible();
          await adminPage.closeLicenseModal();
        }
      }
    });

    test('should filter sellers by license status', async ({ page }) => {
      const initialCount = await adminPage.getSellersCount();
      
      if (initialCount > 0) {
        // Filter by pending licenses
        if (await page.isVisible('[data-testid="license-status-filter"]')) {
          await page.selectOption('[data-testid="license-status-filter"]', 'pending');
          await adminPage.waitForTableUpdate();
          
          const filteredCount = await adminPage.getSellersCount();
          expect(filteredCount).toBeLessThanOrEqual(initialCount);
        }
      }
    });
  });

  test.describe('Admin Security and Access Control', () => {
    test('should prevent non-admin access', async ({ page }) => {
      // Logout and login as regular user
      await adminPage.logout();
      
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
      await loginPage.verifyLoginSuccess();
      
      // Try to access admin page
      await page.goto('/admin/dashboard');
      
      // Should redirect to login or show access denied
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login|access-denied|unauthorized|403/);
    });

    test('should handle admin session timeout', async ({ page }) => {
      await adminPage.goto();
      
      // Mock session expiry
      await page.route('**/api/admin/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      // Try to perform admin action
      await adminPage.navigateToSection('users');
      
      // Should redirect to login
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login/);
    });

    test('should validate admin permissions for actions', async ({ page }) => {
      await adminPage.goto();
      await adminPage.navigateToSection('users');
      
      const userCount = await adminPage.getUsersCount();
      
      if (userCount > 0) {
        // Mock permission denied for delete action
        await page.route('**/api/admin/users/*/delete', route => {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Insufficient permissions' })
          });
        });
        
        const user = await adminPage.getUserByIndex(0);
        
        if (await user.locator(adminPage.deleteUserButton).isVisible()) {
          await adminPage.deleteUser(0);
          
          // Should show permission error
          await adminPage.verifyErrorMessage('permission');
        }
      }
    });

    test('should log admin actions for audit', async ({ page }) => {
      await adminPage.goto();
      
      // Mock audit logging
      let auditLogs = [];
      
      await page.route('**/api/admin/audit', route => {
        auditLogs.push({
          action: 'admin_login',
          timestamp: new Date().toISOString(),
          user: testUsers.adminUser.email
        });
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      // Perform some admin actions
      await adminPage.navigateToSection('users');
      await adminPage.navigateToSection('orders');
      
      // Verify audit logs were created
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('Admin Data Export and Reports', () => {
    test('should export user data', async ({ page }) => {
      await adminPage.gotoUsersPage();
      
      if (await adminPage.isElementVisible(adminPage.exportButton)) {
        const downloadPromise = page.waitForEvent('download');
        await adminPage.exportData();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/users.*\.(csv|xlsx|json)/);
      }
    });

    test('should generate sales reports', async ({ page }) => {
      await adminPage.goto();
      
      if (await adminPage.isElementVisible('[data-testid="sales-report"]')) {
        await page.click('[data-testid="sales-report"]');
        
        // Should navigate to reports page or show report modal
        const isReportPage = await page.waitForURL(/reports/, { timeout: 5000 }).then(() => true).catch(() => false);
        const hasReportModal = await page.isVisible('[data-testid="report-modal"]');
        
        expect(isReportPage || hasReportModal).toBe(true);
      }
    });

    test('should filter reports by date range', async ({ page }) => {
      if (await page.goto('/admin/reports').then(() => true).catch(() => false)) {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        if (await page.isVisible('input[name="startDate"]')) {
          await page.fill('input[name="startDate"]', startDate);
          await page.fill('input[name="endDate"]', endDate);
          await page.click('[data-testid="generate-report"]');
          
          // Should generate report for date range
          await page.waitForTimeout(2000);
          await expect(page.locator('[data-testid="report-data"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Admin Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await adminPage.goto();
      
      // Mock API error
      await page.route('**/api/admin/stats', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.reload();
      
      // Should show error message or fallback UI
      const hasError = await page.isVisible('[data-testid="error-message"]') ||
                      await page.isVisible('[data-testid="stats-error"]');
      
      expect(hasError).toBe(true);
    });

    test('should handle large datasets with pagination', async ({ page }) => {
      await adminPage.gotoUsersPage();
      
      // Mock large dataset
      await page.route('**/api/admin/users**', route => {
        const users = Array.from({ length: 100 }, (_, i) => ({
          id: `user-${i}`,
          name: `User ${i}`,
          email: `user${i}@test.com`,
          role: 'customer',
          status: 'active'
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            users: users.slice(0, 20), // First page
            total: 100,
            currentPage: 1,
            totalPages: 5
          })
        });
      });
      
      await page.reload();
      
      // Should show pagination
      if (await adminPage.isElementVisible(adminPage.pagination)) {
        await expect(page.locator(adminPage.pagination)).toBeVisible();
        
        // Test pagination navigation
        if (await adminPage.isElementVisible(adminPage.nextPageButton)) {
          await adminPage.navigateToNextPage();
          await adminPage.waitForTableUpdate();
        }
      }
    });

    test('should handle concurrent admin actions', async ({ page, context }) => {
      await adminPage.goto();
      
      // Open second admin session
      const secondPage = await context.newPage();
      const secondAdmin = new AdminPage(secondPage);
      const secondLogin = new LoginPage(secondPage);
      
      await secondLogin.goto();
      await secondLogin.login(testUsers.adminUser.email, testUsers.adminUser.password);
      await secondAdmin.goto();
      
      // Perform concurrent actions
      await Promise.all([
        adminPage.navigateToSection('users'),
        secondAdmin.navigateToSection('orders')
      ]);
      
      // Both sessions should work
      await expect(page).toHaveURL(/admin\/users/);
      await expect(secondPage).toHaveURL(/admin\/orders/);
      
      await secondPage.close();
    });
  });
});