/**
 * Utility to test API connectivity
 */

export const testApiConnection = async () => {
  try {
    // Import the apiService dynamically to avoid circular dependencies
    const apiServiceModule = await import('../services/apiService.js');
    const apiService = apiServiceModule.default;
    
    console.log('Testing API connection to:', apiService.baseURL);
    
    // Test a simple health endpoint
    const response = await apiService.get('/health', {}, false);
    console.log('API Connection Test Result:', response);
    
    return {
      success: true,
      baseURL: apiService.baseURL,
      response
    };
  } catch (error) {
    console.error('API Connection Test Failed:', error);
    return {
      success: false,
      error: error.message,
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    };
  }
};