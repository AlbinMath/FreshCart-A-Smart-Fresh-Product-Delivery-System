import apiService from './apiService';

// Upload a new license document (image/pdf)
export const uploadLicense = async (formData) => {
  try {
    const response = await apiService.post('/license/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }, true); // requireAuth = true
    return response;
  } catch (error) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to upload license. Please try again.';
    throw new Error(msg);
  }
};

// Get current license status for the logged-in seller
export const getLicenseStatus = async () => {
  try {
    // This is a public endpoint, so we pass false for requireAuth
    const response = await apiService.get('/license/status', {}, false);
    return response.licenseInfo || null;
  } catch (error) {
    console.error('Error getting license status:', error);
    
    // If it's a 403 error, surface message without redirect
    if (error.response?.status === 403) {
      console.warn('403 Forbidden - User may not have seller role or token is invalid');
      return { status: undefined, rejectionReason: 'Access denied. Seller role required.', updatedAt: new Date().toISOString(), licenseNumber: '', file: null, externalLink: '' };
    }
    
    // For other errors, return minimal inactive-like state without forcing a status string
    return { status: undefined, rejectionReason: '', updatedAt: new Date().toISOString(), licenseNumber: '', file: null, externalLink: '' };
  }
};

// Check if current user has seller role
export const checkSellerRole = async () => {
  try {
    const response = await apiService.get('/users/me');
    const user = response.data || response;
    const hasSellerRole = user && ['seller', 'store'].includes(user.role);
    
    return { 
      hasRole: hasSellerRole, 
      user: user,
      error: hasSellerRole ? null : `User role '${user?.role}' is not authorized for license operations`
    };
  } catch (error) {
    console.error('Error checking seller role:', error);
    return { hasRole: false, error: error.message };
  }
};