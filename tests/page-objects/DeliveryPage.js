// Delivery Verification Page Object Model
const BasePage = require('./BasePage');
const { expect } = require('@playwright/test');

class DeliveryPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Delivery dashboard
    this.deliveryDashboard = '[data-testid="delivery-dashboard"], .delivery-dashboard';
    this.activeOrdersCard = '[data-testid="active-orders"], .active-orders-card';
    this.completedOrdersCard = '[data-testid="completed-orders"], .completed-orders-card';
    this.pendingOrdersCard = '[data-testid="pending-orders"], .pending-orders-card';
    this.earningsCard = '[data-testid="earnings"], .earnings-card';
    
    // Order assignment
    this.availableOrdersList = '[data-testid="available-orders"], .available-orders';
    this.orderCard = '[data-testid="order-card"], .order-card, .delivery-order';
    this.acceptOrderButton = '[data-testid="accept-order"], .accept-order-btn';
    this.rejectOrderButton = '[data-testid="reject-order"], .reject-order-btn';
    this.orderDetails = '[data-testid="order-details"], .order-details';
    this.customerInfo = '[data-testid="customer-info"], .customer-info';
    this.deliveryAddress = '[data-testid="delivery-address"], .delivery-address';
    this.orderItems = '[data-testid="order-items"], .order-items';
    
    // Active deliveries
    this.activeDeliveries = '[data-testid="active-deliveries"], .active-deliveries';
    this.deliveryCard = '[data-testid="delivery-card"], .delivery-card';
    this.startDeliveryButton = '[data-testid="start-delivery"], .start-delivery-btn';
    this.markPickedUpButton = '[data-testid="mark-picked-up"], .mark-picked-up-btn';
    this.markDeliveredButton = '[data-testid="mark-delivered"], .mark-delivered-btn';
    this.orderStatus = '[data-testid="order-status"], .order-status';
    this.estimatedTime = '[data-testid="estimated-time"], .estimated-time';
    
    // Navigation and tracking
    this.navigationButton = '[data-testid="navigate"], .navigate-btn';
    this.trackingMap = '[data-testid="tracking-map"], .tracking-map';
    this.currentLocation = '[data-testid="current-location"], .current-location';
    this.destinationMarker = '[data-testid="destination"], .destination-marker';
    this.routeInfo = '[data-testid="route-info"], .route-info';
    this.distanceInfo = '[data-testid="distance"], .distance-info';
    this.timeInfo = '[data-testid="time-estimate"], .time-estimate';
    
    // Delivery verification
    this.verificationSection = '[data-testid="delivery-verification"], .delivery-verification';
    this.cameraButton = '[data-testid="camera-button"], .camera-btn';
    this.photoUpload = '[data-testid="photo-upload"], input[type="file"][accept="image/*"]';
    this.capturedPhoto = '[data-testid="captured-photo"], .captured-photo';
    this.retakePhotoButton = '[data-testid="retake-photo"], .retake-photo-btn';
    this.verificationCode = '[data-testid="verification-code"], .verification-code';
    this.codeInput = '[data-testid="code-input"], input[name="verificationCode"]';
    this.verifyCodeButton = '[data-testid="verify-code"], .verify-code-btn';
    this.customerSignature = '[data-testid="signature-pad"], .signature-pad';
    this.clearSignatureButton = '[data-testid="clear-signature"], .clear-signature-btn';
    this.saveSignatureButton = '[data-testid="save-signature"], .save-signature-btn';
    
    // Delivery completion
    this.deliveryNotes = '[data-testid="delivery-notes"], textarea[name="deliveryNotes"]';
    this.issueReportButton = '[data-testid="report-issue"], .report-issue-btn';
    this.completeDeliveryButton = '[data-testid="complete-delivery"], .complete-delivery-btn';
    this.confirmDeliveryButton = '[data-testid="confirm-delivery"], .confirm-delivery-btn';
    this.deliverySuccessMessage = '[data-testid="delivery-success"], .delivery-success';
    
    // Issue reporting
    this.issueModal = '[data-testid="issue-modal"], .issue-modal';
    this.issueTypeSelect = '[data-testid="issue-type"], select[name="issueType"]';
    this.issueDescription = '[data-testid="issue-description"], textarea[name="issueDescription"]';
    this.submitIssueButton = '[data-testid="submit-issue"], .submit-issue-btn';
    this.issuePhotoUpload = '[data-testid="issue-photo"], input[type="file"][name="issuePhoto"]';
    
    // Customer communication
    this.callCustomerButton = '[data-testid="call-customer"], .call-customer-btn';
    this.messageCustomerButton = '[data-testid="message-customer"], .message-customer-btn';
    this.chatWindow = '[data-testid="chat-window"], .chat-window';
    this.messageInput = '[data-testid="message-input"], input[name="message"]';
    this.sendMessageButton = '[data-testid="send-message"], .send-message-btn';
    
    // History and earnings
    this.deliveryHistory = '[data-testid="delivery-history"], .delivery-history';
    this.historyItem = '[data-testid="history-item"], .history-item';
    this.earningsPage = '[data-testid="earnings-page"], .earnings-page';
    this.dailyEarnings = '[data-testid="daily-earnings"], .daily-earnings';
    this.weeklyEarnings = '[data-testid="weekly-earnings"], .weekly-earnings';
    this.monthlyEarnings = '[data-testid="monthly-earnings"], .monthly-earnings';
    
    // Profile and settings
    this.deliveryProfile = '[data-testid="delivery-profile"], .delivery-profile';
    this.availabilityToggle = '[data-testid="availability-toggle"], .availability-toggle';
    this.vehicleInfo = '[data-testid="vehicle-info"], .vehicle-info';
    this.updateLocationButton = '[data-testid="update-location"], .update-location-btn';
    
    // Notifications
    this.newOrderNotification = '[data-testid="new-order-notification"], .new-order-notification';
    this.orderUpdateNotification = '[data-testid="order-update"], .order-update-notification';
    this.notificationBell = '[data-testid="notification-bell"], .notification-bell';
    this.notificationList = '[data-testid="notifications"], .notifications-list';
  }

  async gotoDeliveryDashboard() {
    await super.goto('/delivery/dashboard');
  }

  async gotoAvailableOrders() {
    await super.goto('/delivery/orders');
  }

  async gotoActiveDeliveries() {
    await super.goto('/delivery/active');
  }

  async gotoDeliveryHistory() {
    await super.goto('/delivery/history');
  }

  // Order management methods
  async getAvailableOrdersCount() {
    if (await this.isElementVisible(this.orderCard)) {
      return await this.page.locator(this.orderCard).count();
    }
    return 0;
  }

  async getOrderByIndex(index) {
    const orders = this.page.locator(this.orderCard);
    return orders.nth(index);
  }

  async acceptOrder(orderIndex = 0) {
    const order = await this.getOrderByIndex(orderIndex);
    await order.locator(this.acceptOrderButton).click();
    await this.waitForPageLoad();
  }

  async rejectOrder(orderIndex = 0) {
    const order = await this.getOrderByIndex(orderIndex);
    await order.locator(this.rejectOrderButton).click();
    await this.waitForPageLoad();
  }

  async viewOrderDetails(orderIndex = 0) {
    const order = await this.getOrderByIndex(orderIndex);
    await order.click();
    await this.waitForElement(this.orderDetails);
  }

  // Active delivery methods
  async getActiveDeliveriesCount() {
    if (await this.isElementVisible(this.deliveryCard)) {
      return await this.page.locator(this.deliveryCard).count();
    }
    return 0;
  }

  async getActiveDeliveryByIndex(index) {
    const deliveries = this.page.locator(this.deliveryCard);
    return deliveries.nth(index);
  }

  async startDelivery(deliveryIndex = 0) {
    const delivery = await this.getActiveDeliveryByIndex(deliveryIndex);
    await delivery.locator(this.startDeliveryButton).click();
    await this.waitForPageLoad();
  }

  async markAsPickedUp(deliveryIndex = 0) {
    const delivery = await this.getActiveDeliveryByIndex(deliveryIndex);
    await delivery.locator(this.markPickedUpButton).click();
    await this.waitForPageLoad();
  }

  async markAsDelivered(deliveryIndex = 0) {
    const delivery = await this.getActiveDeliveryByIndex(deliveryIndex);
    await delivery.locator(this.markDeliveredButton).click();
    await this.waitForElement(this.verificationSection);
  }

  // Navigation methods
  async openNavigation(deliveryIndex = 0) {
    const delivery = await this.getActiveDeliveryByIndex(deliveryIndex);
    await delivery.locator(this.navigationButton).click();
    
    // This might open a new tab or external navigation app
    await this.page.waitForTimeout(2000);
  }

  async verifyTrackingMap() {
    await expect(this.page.locator(this.trackingMap)).toBeVisible();
    
    if (await this.isElementVisible(this.currentLocation)) {
      await expect(this.page.locator(this.currentLocation)).toBeVisible();
    }
    
    if (await this.isElementVisible(this.destinationMarker)) {
      await expect(this.page.locator(this.destinationMarker)).toBeVisible();
    }
  }

  // Delivery verification methods
  async captureDeliveryPhoto() {
    if (await this.isElementVisible(this.cameraButton)) {
      await this.clickElement(this.cameraButton);
      
      // Mock camera capture
      await this.page.waitForTimeout(1000);
    } else if (await this.isElementVisible(this.photoUpload)) {
      // Use file upload as fallback
      const testImagePath = 'test-files/delivery-photo.jpg';
      await this.page.setInputFiles(this.photoUpload, testImagePath);
    }
    
    await this.waitForElement(this.capturedPhoto);
  }

  async retakePhoto() {
    await this.clickElement(this.retakePhotoButton);
    await this.captureDeliveryPhoto();
  }

  async enterVerificationCode(code) {
    await this.fillField(this.codeInput, code);
    await this.clickElement(this.verifyCodeButton);
  }

  async captureCustomerSignature() {
    if (await this.isElementVisible(this.customerSignature)) {
      // Simulate signature drawing
      const signaturePad = this.page.locator(this.customerSignature);
      const box = await signaturePad.boundingBox();
      
      if (box) {
        // Draw a simple signature (line across the pad)
        await this.page.mouse.move(box.x + 10, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
        await this.page.mouse.up();
      }
      
      await this.clickElement(this.saveSignatureButton);
    }
  }

  async clearSignature() {
    await this.clickElement(this.clearSignatureButton);
  }

  async addDeliveryNotes(notes) {
    if (await this.isElementVisible(this.deliveryNotes)) {
      await this.fillField(this.deliveryNotes, notes);
    }
  }

  async completeDeliveryVerification(verificationData = {}) {
    // Capture photo
    if (verificationData.requirePhoto !== false) {
      await this.captureDeliveryPhoto();
    }
    
    // Enter verification code if required
    if (verificationData.verificationCode) {
      await this.enterVerificationCode(verificationData.verificationCode);
    }
    
    // Capture signature if required
    if (verificationData.requireSignature !== false) {
      await this.captureCustomerSignature();
    }
    
    // Add notes if provided
    if (verificationData.notes) {
      await this.addDeliveryNotes(verificationData.notes);
    }
    
    // Complete delivery
    await this.clickElement(this.completeDeliveryButton);
    
    // Confirm if confirmation dialog appears
    if (await this.isElementVisible(this.confirmDeliveryButton)) {
      await this.clickElement(this.confirmDeliveryButton);
    }
    
    await this.waitForElement(this.deliverySuccessMessage);
  }

  // Issue reporting methods
  async reportIssue(issueData) {
    await this.clickElement(this.issueReportButton);
    await this.waitForElement(this.issueModal);
    
    if (issueData.type) {
      await this.page.selectOption(this.issueTypeSelect, issueData.type);
    }
    
    if (issueData.description) {
      await this.fillField(this.issueDescription, issueData.description);
    }
    
    if (issueData.photo) {
      await this.page.setInputFiles(this.issuePhotoUpload, issueData.photo);
    }
    
    await this.clickElement(this.submitIssueButton);
    await this.page.waitForSelector(this.issueModal, { state: 'hidden' });
  }

  // Customer communication methods
  async callCustomer() {
    await this.clickElement(this.callCustomerButton);
    // This would typically open phone app or make a call
    await this.page.waitForTimeout(1000);
  }

  async sendMessageToCustomer(message) {
    await this.clickElement(this.messageCustomerButton);
    
    if (await this.isElementVisible(this.chatWindow)) {
      await this.fillField(this.messageInput, message);
      await this.clickElement(this.sendMessageButton);
    }
  }

  // Availability methods
  async toggleAvailability() {
    await this.clickElement(this.availabilityToggle);
    await this.page.waitForTimeout(1000);
  }

  async updateLocation() {
    await this.clickElement(this.updateLocationButton);
    
    // Mock location update
    await this.page.evaluate(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          });
        };
      }
    });
    
    await this.page.waitForTimeout(2000);
  }

  // Dashboard stats methods
  async getDashboardStats() {
    const stats = {};
    
    if (await this.isElementVisible(this.activeOrdersCard)) {
      const activeText = await this.getTextContent(`${this.activeOrdersCard} .stat-number`);
      stats.activeOrders = parseInt(activeText) || 0;
    }
    
    if (await this.isElementVisible(this.completedOrdersCard)) {
      const completedText = await this.getTextContent(`${this.completedOrdersCard} .stat-number`);
      stats.completedOrders = parseInt(completedText) || 0;
    }
    
    if (await this.isElementVisible(this.earningsCard)) {
      const earningsText = await this.getTextContent(`${this.earningsCard} .stat-number`);
      stats.earnings = parseFloat(earningsText.replace(/[^0-9.]/g, '')) || 0;
    }
    
    return stats;
  }

  // History methods
  async getDeliveryHistoryCount() {
    if (await this.isElementVisible(this.historyItem)) {
      return await this.page.locator(this.historyItem).count();
    }
    return 0;
  }

  async getHistoryItemByIndex(index) {
    const items = this.page.locator(this.historyItem);
    return items.nth(index);
  }

  async viewHistoryDetails(index) {
    const item = await this.getHistoryItemByIndex(index);
    await item.click();
    await this.waitForPageLoad();
  }

  // Verification methods
  async verifyDeliveryDashboard() {
    await expect(this.page.locator(this.deliveryDashboard)).toBeVisible();
    
    if (await this.isElementVisible(this.activeOrdersCard)) {
      await expect(this.page.locator(this.activeOrdersCard)).toBeVisible();
    }
  }

  async verifyOrderAccepted() {
    await expect(this.page.locator(this.deliverySuccessMessage)).toBeVisible();
  }

  async verifyDeliveryCompleted() {
    await expect(this.page.locator(this.deliverySuccessMessage)).toBeVisible();
  }

  async verifyIssueReported() {
    // Look for success message or notification
    const hasSuccessMessage = await this.isElementVisible('[data-testid="issue-success"]');
    const hasNotification = await this.isElementVisible(this.orderUpdateNotification);
    
    expect(hasSuccessMessage || hasNotification).toBe(true);
  }

  async verifyNotificationReceived(notificationType) {
    if (await this.isElementVisible(this.newOrderNotification) && notificationType === 'new-order') {
      await expect(this.page.locator(this.newOrderNotification)).toBeVisible();
    } else if (await this.isElementVisible(this.orderUpdateNotification)) {
      await expect(this.page.locator(this.orderUpdateNotification)).toBeVisible();
    }
  }

  async verifyTrackingInformation() {
    if (await this.isElementVisible(this.routeInfo)) {
      await expect(this.page.locator(this.routeInfo)).toBeVisible();
    }
    
    if (await this.isElementVisible(this.distanceInfo)) {
      await expect(this.page.locator(this.distanceInfo)).toBeVisible();
    }
    
    if (await this.isElementVisible(this.timeInfo)) {
      await expect(this.page.locator(this.timeInfo)).toBeVisible();
    }
  }

  async verifyOrderDetails(orderIndex = 0) {
    const order = await this.getOrderByIndex(orderIndex);
    
    await expect(order.locator(this.customerInfo)).toBeVisible();
    await expect(order.locator(this.deliveryAddress)).toBeVisible();
    await expect(order.locator(this.orderItems)).toBeVisible();
  }

  async verifyDeliveryStatus(expectedStatus) {
    if (await this.isElementVisible(this.orderStatus)) {
      const statusText = await this.getTextContent(this.orderStatus);
      expect(statusText.toLowerCase()).toContain(expectedStatus.toLowerCase());
    }
  }
}

module.exports = DeliveryPage;