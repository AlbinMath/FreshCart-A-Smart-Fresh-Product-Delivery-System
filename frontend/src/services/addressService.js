const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const addressService = {
  // Get user's saved addresses
  getAddresses: async (uid) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/addresses`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-uid': uid,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch addresses');
    }
    return data.addresses || data;
  },

  // Add new address
  addAddress: async (uid, addressData) => {
    const token = localStorage.getItem('token');
    
    // Transform frontend address data to match backend schema
    const transformedData = {
      type: addressData.type || 'home',
      name: addressData.name,
      phone: addressData.phone,
      street: addressData.address, // Map 'address' to 'street'
      landmark: addressData.landmark,
      city: addressData.city,
      state: addressData.state,
      zipCode: addressData.pincode, // Map 'pincode' to 'zipCode'
      country: addressData.country || 'India',
      coordinates: addressData.coordinates,
      isDefault: addressData.isDefault || false
    };

    const response = await fetch(`${API_BASE_URL}/addresses/add`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-uid': uid,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(transformedData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add address');
    }
    return data;
  },

  // Update address
  updateAddress: async (uid, addressId, addressData) => {
    const token = localStorage.getItem('token');
    
    // Transform frontend address data to match backend schema
    const transformedData = {
      type: addressData.type || 'home',
      name: addressData.name,
      phone: addressData.phone,
      street: addressData.address, // Map 'address' to 'street'
      landmark: addressData.landmark,
      city: addressData.city,
      state: addressData.state,
      zipCode: addressData.pincode, // Map 'pincode' to 'zipCode'
      country: addressData.country || 'India',
      coordinates: addressData.coordinates,
      isDefault: addressData.isDefault || false
    };

    const response = await fetch(`${API_BASE_URL}/addresses/update/${addressId}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-uid': uid,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(transformedData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update address');
    }
    return data;
  },

  // Delete address
  deleteAddress: async (uid, addressId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/addresses/delete/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-uid': uid,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete address');
    }
    return data;
  }
};