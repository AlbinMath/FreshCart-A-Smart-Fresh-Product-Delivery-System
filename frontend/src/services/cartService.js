import apiService from './apiService';

export const cartService = {
  // Get customer's cart
  getCart: async (uid) => {
    const response = await apiService.get('/cart', {
      headers: apiService.getUidHeaders(uid)
    });
    return response.cart;
  },

  // Add item to cart
  addToCart: async (uid, productData) => {
    const response = await apiService.post('/cart/add', productData, {
      headers: apiService.getUidHeaders(uid)
    });
    return response.cart;
  },

  // Update cart item quantity
  updateCartItem: async (uid, itemId, quantity) => {
    const response = await apiService.put(`/cart/update/${itemId}`, { quantity }, {
      headers: apiService.getUidHeaders(uid)
    });
    return response.cart;
  },

  // Remove item from cart
  removeFromCart: async (uid, itemId) => {
    const response = await apiService.delete(`/cart/remove/${itemId}`, {
      headers: apiService.getUidHeaders(uid)
    });
    return response.cart;
  },

  // Clear cart
  clearCart: async (uid) => {
    const response = await apiService.delete('/cart/clear', {
      headers: apiService.getUidHeaders(uid)
    });
    return response;
  }
};