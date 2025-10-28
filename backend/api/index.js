// Simple Vercel function that handles API routes for the backend
import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// Import routes
import authRoutes from '../routes/authRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import uploadRoutes from '../routes/uploadRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';
import productRoutes from '../routes/productRoutes.js';
import productUploadRoutes from '../routes/productUploadRoutes.js';
import activityRoutes from '../routes/activityRoutes.js';
import walletRoutes from '../routes/walletRoutes.js';
import deliveryWalletRoutes from '../routes/deliveryWalletRoutes.js';
import licenseRoutes from '../routes/licenseRoutes.js';
import cartRoutes from '../routes/cartRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import addressRoutes from '../routes/addressRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import adminLicenseRoutes from '../routes/adminLicenseRoutes.js';
import sellerFarmerTransactionRoutes from '../routes/sellerFarmerTransactionRoutes.js';
import deliveryVerificationRoutes from '../routes/deliveryVerificationRoutes.js';
import farmerProductRoutes from '../routes/farmerProductRoutes.js';
import { logActivity } from '../middleware/activityLogger.js';

const app = express();

// CORS configuration for Vercel deployment
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'https://fresh-cart-two-pi.vercel.app',  // Frontend URL
    /\.vercel\.app$/  // Allow all Vercel deployments
  ],
  credentials: true
}));

// HTTP request logger
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request ID and timestamp to each request
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  req.startTime = process.hrtime();
  next();
});

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.log('⚠️  MongoDB URI not set - skipping connection');
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/upload', productUploadRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes); // Cart routes
app.use('/api/users', walletRoutes); // Wallet routes (regular users)
app.use('/api/delivery', deliveryWalletRoutes); // Delivery wallet routes
app.use('/api/license', licenseRoutes); // License routes
app.use('/api/notifications', notificationRoutes); // Notification routes
app.use('/api/addresses', addressRoutes); // Address routes
app.use('/api/payment', paymentRoutes); // Payment routes
app.use('/api/orders', orderRoutes); // Order routes
app.use('/api/admin/licenses', adminLicenseRoutes); // Admin license management
app.use('/api', sellerFarmerTransactionRoutes); // Seller-Farmer transaction routes
app.use('/api', farmerProductRoutes); // Farmer product routes
app.use('/api/delivery-verification', deliveryVerificationRoutes); // Delivery verification routes

// Basic Route
app.get('/', (req, res) => res.send('FreshCart API Running on Vercel'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FreshCart API is running on Vercel',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Log all API requests
app.use('/api/*', logActivity('api-request', 'system', {
  captureResponse: true,
  captureRequest: true
}));

// Catch-all 404 handler for API routes must come after specific routers
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  return next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error with request details
  console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: req.requestId,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Send error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);