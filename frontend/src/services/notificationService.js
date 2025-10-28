import apiService from './apiService';

/**
 * Get notifications for the current user
 * @param {number} page - Page number
 * @param {number} limit - Number of notifications per page
 * @param {boolean} unreadOnly - Whether to fetch only unread notifications
 * @returns {Promise<Object>} Notifications data
 */
export async function getNotifications(page = 1, limit = 20, unreadOnly = false) {
  const endpoint = `/users/${apiService.baseURL.replace(/\/api$/, '')}/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`;
  return await apiService.get(endpoint);
}

/**
 * Get unread notification count for the current user
 * @returns {Promise<number>} Unread notification count
 */
export async function getUnreadCount() {
  const endpoint = '/users/notifications/unread-count';
  const response = await apiService.get(endpoint);
  return response.count || 0;
}

/**
 * Get notification statistics for the current user
 * @returns {Promise<Object>} Notification statistics
 */
export async function getNotificationStats() {
  const endpoint = '/users/notifications/stats';
  return await apiService.get(endpoint);
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Response data
 */
export async function markAsRead(notificationId) {
  const endpoint = `/users/notifications/${notificationId}/read`;
  return await apiService.post(endpoint, {});
}

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Response data
 */
export async function markAllAsRead() {
  const endpoint = '/users/notifications/read-all';
  return await apiService.post(endpoint, {});
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Response data
 */
export async function deleteNotification(notificationId) {
  const endpoint = `/users/notifications/${notificationId}`;
  return await apiService.delete(endpoint);
}

/**
 * Clear all notifications
 * @returns {Promise<Object>} Response data
 */
export async function clearAllNotifications() {
  const endpoint = '/users/notifications/clear';
  return await apiService.post(endpoint, {});
}

/**
 * Update notification preferences
 * @param {Object} preferences - Notification preferences
 * @returns {Promise<Object>} Response data
 */
export async function updateNotificationPreferences(preferences) {
  const endpoint = '/users/notifications/preferences';
  return await apiService.put(endpoint, preferences);
}