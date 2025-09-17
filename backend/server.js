import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { init as initSocket } from './config/socket.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import productUploadRoutes from './routes/productUploadRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
// import adminLicenseRoutes from './routes/adminLicenseRoutes.js';
import { logActivity } from './middleware/activityLogger.js';
import Activity from './models/Activity.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Frontend URLs
  credentials: true
}));

// HTTP request logger
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request ID and timestamp to each request
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  req.startTime = process.hrtime();
  next();
});

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/upload', productUploadRoutes);
app.use('/api', productRoutes);
app.use('/api/users', walletRoutes); // Wallet routes
app.use('/api/license', licenseRoutes); // License routes
// app.use('/api/admin/licenses', adminLicenseRoutes); // Admin license management

// Basic Route
app.get('/', (req, res) => res.send('FreshCart API Running'));

// Log all API requests
app.use('/api/*', logActivity('api-request', 'system', {
  captureResponse: true,
  captureRequest: true
}));

// JSON 404 for API routes (prevents HTML bodies that break frontend JSON parsing)
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
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

  // Log the error to activity log
  Activity.create({
    actorUid: req.user?.uid || 'system',
    actorEmail: req.user?.email || 'system@freshcart.com',
    actorRole: req.user?.role || 'system',
    action: 'error',
    actionType: 'system',
    status: 'failed',
    details: {
      method: req.method,
      path: req.path,
      error: err.message,
      statusCode: err.statusCode || 500,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }).catch(console.error);

  // Send error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});