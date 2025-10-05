// Test data fixtures for FreshCart application

const testUsers = {
  validUser: {
    email: 'test.user@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    phone: '+1234567890',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country'
    }
  },
  
  adminUser: {
    email: 'admin.test@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin'
  },
  
  sellerUser: {
    email: 'seller.test@example.com',
    password: 'SellerPassword123!',
    name: 'Seller User',
    role: 'seller',
    businessName: 'Test Seller Business',
    licenseNumber: 'LIC123456789'
  },
  
  deliveryUser: {
    email: 'delivery.test@example.com',
    password: 'DeliveryPassword123!',
    name: 'Delivery User',
    role: 'delivery_partner'
  }
};

const testProducts = {
  freshProduct: {
    name: 'Fresh Organic Apples',
    description: 'Fresh organic apples from local farms',
    price: 4.99,
    category: 'fruits',
    image: 'test-apple.jpg',
    stock: 100,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    seller: 'test-seller-id'
  },
  
  vegetable: {
    name: 'Fresh Carrots',
    description: 'Crisp and fresh carrots',
    price: 2.49,
    category: 'vegetables',
    image: 'test-carrot.jpg',
    stock: 150,
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    seller: 'test-seller-id'
  }
};

const testOrders = {
  standardOrder: {
    items: [
      {
        productId: 'test-product-1',
        quantity: 2,
        price: 4.99
      },
      {
        productId: 'test-product-2',
        quantity: 1,
        price: 2.49
      }
    ],
    total: 12.47,
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345'
    },
    paymentMethod: 'card'
  }
};

const testCredentials = {
  google: {
    email: process.env.GOOGLE_TEST_EMAIL || 'test@gmail.com',
    password: process.env.GOOGLE_TEST_PASSWORD || 'test-password'
  }
};

module.exports = {
  testUsers,
  testProducts,
  testOrders,
  testCredentials
};