import axios from 'axios';

// Base API URL (align with sellerService)
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').trim();
const ROOT_URL = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/i, '');
const API_BASE = `${ROOT_URL}/api`;

// Get all notifications for the authenticated user
const getNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.get(`${API_BASE}/notifications`, {
      params: { page, limit, unreadOnly },
      headers,
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
  }
};

// Mark notification as read
const markAsRead = async (notificationId) => {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.put(`${API_BASE}/notifications/${notificationId}/read`, null, { headers, withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
  }
};

// Mark all notifications as read
const markAllAsRead = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.put(`${API_BASE}/notifications/mark-all-read`, null, { headers, withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
  }
};

// Delete notification
const deleteNotification = async (notificationId) => {
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.delete(`${API_BASE}/notifications/${notificationId}`, { headers, withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete notification');
  }
};

// Clear all notifications
const clearAllNotifications = async () => {
  try {
    const response = await axios.delete(`${API_BASE}/notifications/clear-all`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw new Error(error.response?.data?.message || 'Failed to clear all notifications');
  }
};

// Get notification statistics
const getNotificationStats = async () => {
  try {
    const response = await axios.get(`${API_BASE}/notifications/stats`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch notification statistics');
  }
};

// Update notification preferences
const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await axios.put(`${API_BASE}/notifications/preferences`, preferences, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw new Error(error.response?.data?.message || 'Failed to update notification preferences');
  }
};

// Get unread notification count (lightweight)
const getUnreadCount = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await axios.get(`${API_BASE}/notifications`, {
      params: { limit: 1, unreadOnly: true },
      headers,
      withCredentials: true
    });
    return response.data.unreadCount || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
  updateNotificationPreferences,
  getUnreadCount
};

