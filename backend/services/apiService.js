/**
 * Centralized API Service for FreshCart
 * Handles all HTTP requests to the backend with consistent error handling and authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get authentication headers
   * @returns {Object} Headers object with authorization
   */
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get headers with UID
   * @param {string} uid - User ID
   * @returns {Object} Headers object with UID
   */
  getUidHeaders(uid) {
    return {
      'Content-Type': 'application/json',
      'x-uid': uid
    };
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      ...options
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
      ...options
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data = {}, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
      ...options
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      ...options
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make request with UID header
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {string} uid - User ID
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} Response data
   */
  async requestWithUid(method, endpoint, uid, data = null) {
    const options = {
      method: method.toUpperCase(),
      headers: this.getUidHeaders(uid),
      credentials: 'include'
    };

    if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return this.handleResponse(response);
  }

  /**
   * Upload file
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async uploadFile(endpoint, formData, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      ...options
    });
    
    return this.handleResponse(response);
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;