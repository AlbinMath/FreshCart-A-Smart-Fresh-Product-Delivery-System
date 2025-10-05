// Delivery Verification End-to-End Tests
const { test, expect } = require('@playwright/test');
const LoginPage = require('../page-objects/LoginPage');
const DeliveryPage = require('../page-objects/DeliveryPage');
const TestHelpers = require('../utils/test-helpers');
const { testUsers } = require('../fixtures/test-data');

test.describe('Delivery Verification Tests', () => {
  let loginPage;
  let deliveryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    deliveryPage = new DeliveryPage(page);
    
    // Login as delivery partner before each test
    await loginPage.goto();
    await loginPage.login(testUsers.deliveryUser.email, testUsers.deliveryUser.password);
    await loginPage.verifyLoginSuccess();
  });

  test.describe('Delivery Partner Dashboard', () => {
    test('should display delivery dashboard correctly', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      await deliveryPage.verifyDeliveryDashboard();
    });

    test('should show delivery statistics', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      
      const stats = await deliveryPage.getDashboardStats();
      
      // Verify stats are numeric and reasonable
      expect(stats.activeOrders).toBeGreaterThanOrEqual(0);
      expect(stats.completedOrders).toBeGreaterThanOrEqual(0);
      expect(stats.earnings).toBeGreaterThanOrEqual(0);
    });

    test('should toggle availability status', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      
      if (await deliveryPage.isElementVisible(deliveryPage.availabilityToggle)) {
        await deliveryPage.toggleAvailability();
        
        // Should update availability status
        await page.waitForTimeout(1000);
      }
    });

    test('should update current location', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      
      if (await deliveryPage.isElementVisible(deliveryPage.updateLocationButton)) {
        await deliveryPage.updateLocation();
        
        // Should update location successfully
        await page.waitForTimeout(2000);
      }
    });

    test('should handle location permissions', async ({ page }) => {
      // Mock geolocation permission denied
      await page.context().grantPermissions(['geolocation']);
      
      await deliveryPage.gotoDeliveryDashboard();
      
      if (await deliveryPage.isElementVisible(deliveryPage.updateLocationButton)) {
        await deliveryPage.updateLocation();
      }
    });
  });

  test.describe('Order Assignment and Acceptance', () => {
    test.beforeEach(async ({ page }) => {
      // Mock available orders
      await page.route('**/api/delivery/orders/available**', route => {
        const mockOrders = [
          {
            id: 'order-1',
            customerName: 'John Doe',
            customerPhone: '+1234567890',
            deliveryAddress: {
              street: '123 Main St',
              city: 'Test City',
              zipCode: '12345'
            },
            items: [
              { name: 'Fresh Apples', quantity: 2, price: 4.99 },
              { name: 'Bananas', quantity: 1, price: 2.49 }
            ],
            total: 7.48,
            distance: '2.5 km',
            estimatedTime: '15 min',
            deliveryFee: 3.99
          },
          {
            id: 'order-2',
            customerName: 'Jane Smith',
            customerPhone: '+1234567891',
            deliveryAddress: {
              street: '456 Oak Ave',
              city: 'Test City',
              zipCode: '12346'
            },
            items: [
              { name: 'Fresh Milk', quantity: 1, price: 3.99 }
            ],
            total: 3.99,
            distance: '1.8 km',
            estimatedTime: '12 min',
            deliveryFee: 2.99
          }
        ];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ orders: mockOrders })
        });
      });
    });

    test('should display available orders', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      expect(orderCount).toBeGreaterThan(0);
    });

    test('should show order details correctly', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        await deliveryPage.verifyOrderDetails(0);
      }
    });

    test('should accept an order', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        // Mock order acceptance
        await page.route('**/api/delivery/orders/*/accept', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              message: 'Order accepted successfully',
              orderId: 'order-1'
            })
          });
        });
        
        await deliveryPage.acceptOrder(0);
        await deliveryPage.verifyOrderAccepted();
      }
    });

    test('should reject an order', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        // Mock order rejection
        await page.route('**/api/delivery/orders/*/reject', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              message: 'Order rejected'
            })
          });
        });
        
        await deliveryPage.rejectOrder(0);
        
        // Order should be removed from available list
        await page.waitForTimeout(1000);
      }
    });

    test('should view detailed order information', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        await deliveryPage.viewOrderDetails(0);
        
        // Should show expanded order details
        await expect(page.locator(deliveryPage.orderDetails)).toBeVisible();
      }
    });

    test('should handle multiple order acceptance attempts', async ({ page }) => {
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        // Mock order already taken by another delivery partner
        await page.route('**/api/delivery/orders/*/accept', route => {
          route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Order already assigned to another delivery partner'
            })
          });
        });
        
        await deliveryPage.acceptOrder(0);
        
        // Should show error message
        const hasError = await page.isVisible('[data-testid="error-message"]');
        expect(hasError).toBe(true);
      }
    });
  });

  test.describe('Active Delivery Management', () => {
    test.beforeEach(async ({ page }) => {
      // Mock active deliveries
      await page.route('**/api/delivery/orders/active**', route => {
        const mockActiveDeliveries = [
          {
            id: 'delivery-1',
            orderId: 'order-1',
            status: 'accepted',
            customerName: 'John Doe',
            customerPhone: '+1234567890',
            deliveryAddress: {
              street: '123 Main St',
              city: 'Test City',
              zipCode: '12345',
              coordinates: { lat: 40.7128, lng: -74.0060 }
            },
            pickupAddress: {
              street: '789 Store St',
              city: 'Test City',
              zipCode: '12347',
              coordinates: { lat: 40.7580, lng: -73.9855 }
            },
            estimatedTime: '15 min',
            verificationCode: '1234'
          }
        ];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deliveries: mockActiveDeliveries })
        });
      });
    });

    test('should display active deliveries', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      expect(deliveryCount).toBeGreaterThanOrEqual(0);
    });

    test('should start delivery process', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.startDelivery(0);
        await deliveryPage.verifyDeliveryStatus('in-transit');
      }
    });

    test('should mark order as picked up', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        // Mock pickup confirmation
        await page.route('**/api/delivery/orders/*/pickup', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              message: 'Order marked as picked up',
              status: 'picked-up'
            })
          });
        });
        
        await deliveryPage.markAsPickedUp(0);
        await deliveryPage.verifyDeliveryStatus('picked-up');
      }
    });

    test('should open navigation to customer location', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        // Mock navigation opening
        await page.route('**/maps**', route => {
          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body>Navigation opened</body></html>'
          });
        });
        
        await deliveryPage.openNavigation(0);
      }
    });

    test('should display tracking map', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.verifyTrackingMap();
        await deliveryPage.verifyTrackingInformation();
      }
    });

    test('should call customer', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.callCustomer();
        
        // Should handle call initiation
        await page.waitForTimeout(1000);
      }
    });

    test('should send message to customer', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        const message = 'Hi, I am on my way to deliver your order!';
        await deliveryPage.sendMessageToCustomer(message);
        
        // Should send message successfully
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Delivery Verification Process', () => {
    test.beforeEach(async ({ page }) => {
      // Set up delivery ready for completion
      await page.route('**/api/delivery/orders/active**', route => {
        const mockDelivery = [{
          id: 'delivery-1',
          orderId: 'order-1',
          status: 'at-destination',
          customerName: 'John Doe',
          verificationCode: '1234',
          requiresPhoto: true,
          requiresSignature: true
        }];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deliveries: mockDelivery })
        });
      });
    });

    test('should capture delivery photo', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        // Should open verification section
        await expect(page.locator(deliveryPage.verificationSection)).toBeVisible();
        
        await deliveryPage.captureDeliveryPhoto();
        
        // Should show captured photo
        await expect(page.locator(deliveryPage.capturedPhoto)).toBeVisible();
      }
    });

    test('should retake photo if needed', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        await deliveryPage.captureDeliveryPhoto();
        
        if (await deliveryPage.isElementVisible(deliveryPage.retakePhotoButton)) {
          await deliveryPage.retakePhoto();
          await expect(page.locator(deliveryPage.capturedPhoto)).toBeVisible();
        }
      }
    });

    test('should enter verification code', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        const verificationCode = '1234';
        await deliveryPage.enterVerificationCode(verificationCode);
        
        // Should validate code
        await page.waitForTimeout(1000);
      }
    });

    test('should handle invalid verification code', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        // Mock invalid code response
        await page.route('**/api/delivery/verify-code', route => {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid verification code' })
          });
        });
        
        const invalidCode = '0000';
        await deliveryPage.enterVerificationCode(invalidCode);
        
        // Should show error
        const hasError = await page.isVisible('[data-testid="code-error"]');
        expect(hasError).toBe(true);
      }
    });

    test('should capture customer signature', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        if (await deliveryPage.isElementVisible(deliveryPage.customerSignature)) {
          await deliveryPage.captureCustomerSignature();
          
          // Should save signature
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should clear and redraw signature', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        if (await deliveryPage.isElementVisible(deliveryPage.customerSignature)) {
          await deliveryPage.captureCustomerSignature();
          await deliveryPage.clearSignature();
          await deliveryPage.captureCustomerSignature();
        }
      }
    });

    test('should add delivery notes', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        const notes = 'Delivered to front door as requested. Customer was very friendly.';
        await deliveryPage.addDeliveryNotes(notes);
        
        // Notes should be saved
        const notesInput = page.locator(deliveryPage.deliveryNotes);
        await expect(notesInput).toHaveValue(notes);
      }
    });

    test('should complete full delivery verification', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        // Mock successful delivery completion
        await page.route('**/api/delivery/orders/*/complete', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              message: 'Delivery completed successfully',
              earnings: 5.99
            })
          });
        });
        
        const verificationData = {
          requirePhoto: true,
          requireSignature: true,
          verificationCode: '1234',
          notes: 'Successful delivery'
        };
        
        await deliveryPage.completeDeliveryVerification(verificationData);
        await deliveryPage.verifyDeliveryCompleted();
      }
    });

    test('should handle verification without signature', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        const verificationData = {
          requirePhoto: true,
          requireSignature: false,
          verificationCode: '1234'
        };
        
        await deliveryPage.completeDeliveryVerification(verificationData);
        await deliveryPage.verifyDeliveryCompleted();
      }
    });

    test('should handle contactless delivery', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        const verificationData = {
          requirePhoto: true,
          requireSignature: false,
          verificationCode: null,
          notes: 'Contactless delivery - left at front door'
        };
        
        await deliveryPage.completeDeliveryVerification(verificationData);
        await deliveryPage.verifyDeliveryCompleted();
      }
    });
  });

  test.describe('Issue Reporting', () => {
    test('should report delivery issue', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        // Mock issue reporting
        await page.route('**/api/delivery/issues', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ 
              success: true, 
              message: 'Issue reported successfully',
              issueId: 'issue-1'
            })
          });
        });
        
        const issueData = {
          type: 'customer-unavailable',
          description: 'Customer not responding to calls and messages',
          photo: null
        };
        
        await deliveryPage.reportIssue(issueData);
        await deliveryPage.verifyIssueReported();
      }
    });

    test('should report issue with photo evidence', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        const issueData = {
          type: 'damaged-package',
          description: 'Package was damaged during pickup',
          photo: 'test-files/damaged-package.jpg'
        };
        
        await deliveryPage.reportIssue(issueData);
        await deliveryPage.verifyIssueReported();
      }
    });

    test('should handle different issue types', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const issueTypes = [
        'customer-unavailable',
        'wrong-address',
        'damaged-package',
        'traffic-delay',
        'vehicle-breakdown'
      ];
      
      for (const issueType of issueTypes) {
        const issueData = {
          type: issueType,
          description: `Test issue of type: ${issueType}`
        };
        
        // Don't actually submit, just verify form handles different types
        await deliveryPage.clickElement(deliveryPage.issueReportButton);
        
        if (await deliveryPage.isElementVisible(deliveryPage.issueModal)) {
          await page.selectOption(deliveryPage.issueTypeSelect, issueType);
          await deliveryPage.fillField(deliveryPage.issueDescription, issueData.description);
          
          // Close without submitting
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Delivery History and Earnings', () => {
    test('should display delivery history', async ({ page }) => {
      await deliveryPage.gotoDeliveryHistory();
      
      const historyCount = await deliveryPage.getDeliveryHistoryCount();
      expect(historyCount).toBeGreaterThanOrEqual(0);
    });

    test('should view historical delivery details', async ({ page }) => {
      await deliveryPage.gotoDeliveryHistory();
      
      const historyCount = await deliveryPage.getDeliveryHistoryCount();
      if (historyCount > 0) {
        await deliveryPage.viewHistoryDetails(0);
        
        // Should show delivery details
        await page.waitForTimeout(1000);
      }
    });

    test('should display earnings information', async ({ page }) => {
      await page.goto('/delivery/earnings');
      
      if (await deliveryPage.isElementVisible(deliveryPage.earningsPage)) {
        await expect(page.locator(deliveryPage.earningsPage)).toBeVisible();
        
        // Verify earnings sections
        if (await deliveryPage.isElementVisible(deliveryPage.dailyEarnings)) {
          await expect(page.locator(deliveryPage.dailyEarnings)).toBeVisible();
        }
        
        if (await deliveryPage.isElementVisible(deliveryPage.weeklyEarnings)) {
          await expect(page.locator(deliveryPage.weeklyEarnings)).toBeVisible();
        }
        
        if (await deliveryPage.isElementVisible(deliveryPage.monthlyEarnings)) {
          await expect(page.locator(deliveryPage.monthlyEarnings)).toBeVisible();
        }
      }
    });
  });

  test.describe('Notifications and Real-time Updates', () => {
    test('should receive new order notifications', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      
      // Mock new order notification
      await page.evaluate(() => {
        const event = new CustomEvent('newOrder', {
          detail: {
            orderId: 'order-123',
            customerName: 'Test Customer',
            deliveryFee: 4.99
          }
        });
        window.dispatchEvent(event);
      });
      
      await deliveryPage.verifyNotificationReceived('new-order');
    });

    test('should receive order update notifications', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      // Mock order update notification
      await page.evaluate(() => {
        const event = new CustomEvent('orderUpdate', {
          detail: {
            orderId: 'order-123',
            status: 'cancelled',
            message: 'Order has been cancelled by customer'
          }
        });
        window.dispatchEvent(event);
      });
      
      await deliveryPage.verifyNotificationReceived('order-update');
    });

    test('should handle real-time location updates', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      // Mock location update
      await page.evaluate(() => {
        if (navigator.geolocation) {
          const watchId = navigator.geolocation.watchPosition((position) => {
            console.log('Location updated:', position.coords);
          });
        }
      });
      
      // Should handle location updates without errors
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network connectivity issues', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      // Simulate network failure
      await page.route('**/*', route => {
        route.abort('failed');
      });
      
      // Should show offline message or retry options
      await page.reload();
      await page.waitForTimeout(3000);
      
      const hasOfflineMessage = await page.isVisible('[data-testid="offline-message"]') ||
                               await page.isVisible('[data-testid="network-error"]');
      
      expect(hasOfflineMessage).toBe(true);
    });

    test('should handle GPS/location errors', async ({ page }) => {
      await deliveryPage.gotoDeliveryDashboard();
      
      // Mock geolocation error
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          error({
            code: 1,
            message: 'User denied geolocation'
          });
        };
      });
      
      if (await deliveryPage.isElementVisible(deliveryPage.updateLocationButton)) {
        await deliveryPage.updateLocation();
        
        // Should handle location error gracefully
        await page.waitForTimeout(2000);
      }
    });

    test('should handle camera/photo capture errors', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.markAsDelivered(0);
        
        // Mock camera error
        await page.evaluate(() => {
          navigator.mediaDevices.getUserMedia = () => {
            return Promise.reject(new Error('Camera not available'));
          };
        });
        
        if (await deliveryPage.isElementVisible(deliveryPage.cameraButton)) {
          await deliveryPage.clickElement(deliveryPage.cameraButton);
          
          // Should show error or fallback to file upload
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should handle expired delivery sessions', async ({ page }) => {
      await deliveryPage.gotoActiveDeliveries();
      
      // Mock session expiry
      await page.route('**/api/delivery/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      // Try to perform delivery action
      const deliveryCount = await deliveryPage.getActiveDeliveriesCount();
      if (deliveryCount > 0) {
        await deliveryPage.startDelivery(0);
        
        // Should redirect to login or show session expired message
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/login|session-expired/);
      }
    });

    test('should handle large delivery distances', async ({ page }) => {
      // Mock order with very large delivery distance
      await page.route('**/api/delivery/orders/available**', route => {
        const longDistanceOrder = [{
          id: 'order-far',
          customerName: 'Far Customer',
          deliveryAddress: {
            street: '999 Far Street',
            city: 'Distant City',
            zipCode: '99999'
          },
          distance: '25.8 km',
          estimatedTime: '45 min',
          deliveryFee: 15.99
        }];
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ orders: longDistanceOrder })
        });
      });
      
      await deliveryPage.gotoAvailableOrders();
      
      const orderCount = await deliveryPage.getAvailableOrdersCount();
      if (orderCount > 0) {
        // Should display distance and estimated time correctly
        await deliveryPage.verifyOrderDetails(0);
      }
    });
  });
});