import axios from 'axios';

// Resolve API base URL from Vite env with a sensible default
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Upload a new license document (image/pdf)
const uploadLicense = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.post(`${API_URL}/api/license/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to upload license. Please try again.';
    throw new Error(errorMessage);
  }
};

// Update an existing license document (image/pdf optional)
const updateLicense = async (formData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.put(`${API_URL}/api/license/update`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to update license. Please try again.';
    throw new Error(errorMessage);
  }
};

// Submit a URL-only license (no file)
const uploadLicenseLink = async ({ licenseNumber, licenseUrl }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    const response = await axios.post(`${API_URL}/api/license/link`, { licenseNumber, licenseUrl }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to submit license link.';
    throw new Error(errorMessage);
  }
};

// Get current license status for the logged-in seller
const getLicenseStatus = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.get(`${API_URL}/api/license/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    const info = response.data.licenseInfo || {};
    return {
      status: info.status || 'inactive',
      rejectionReason: info.rejectionReason || '',
      updatedAt: info.verifiedAt || info.updatedAt || new Date().toISOString(),
      licenseNumber: info.licenseNumber || '',
      file: info.file || null,
      externalLink: info.externalLink || ''
    };
  } catch (error) {
    console.error('Error getting license status:', error);
    return {
      status: 'inactive',
      rejectionReason: '',
      updatedAt: new Date().toISOString()
    };
  }
};

// Admin helpers (unchanged)
const getPendingSellers = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.get(`${API_URL}/api/admin/sellers/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data.sellers || [];
  } catch (error) {
    console.error('Error getting pending sellers:', error);
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch pending sellers. Please try again.';
    throw new Error(errorMessage);
  }
};

const approveSeller = async (sellerId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.put(
      `${API_URL}/api/admin/sellers/${sellerId}/approve`, 
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to approve seller. Please try again.';
    throw new Error(errorMessage);
  }
};

const rejectSeller = async (sellerId, reason) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await axios.put(
      `${API_URL}/api/admin/sellers/${sellerId}/reject`, 
      { reason },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to reject seller. Please try again.';
    throw new Error(errorMessage);
  }
};

export { 
  uploadLicense,
  updateLicense,
  uploadLicenseLink,
  getLicenseStatus,
  getPendingSellers,
  approveSeller,
  rejectSeller
};
