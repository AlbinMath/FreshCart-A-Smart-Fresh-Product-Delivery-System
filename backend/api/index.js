// Simple Vercel function that handles API routes for the backend
import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

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

// Store MongoDB connection state
let mongoConnected = false;
let mongoConnectionError = null;

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
    .then(() => {
      console.log('✅ MongoDB Connected');
      mongoConnected = true;
      mongoConnectionError = null;
    })
    .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
      mongoConnected = false;
      mongoConnectionError = err;
    });
} else {
  console.log('⚠️  MongoDB URI not set - skipping connection');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FreshCart API is running on Vercel',
    mongoConnected,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API test endpoint working',
    mongoConnected,
    timestamp: new Date().toISOString()
  });
});

// Middleware to check MongoDB connection before handling requests
app.use('/api/*', (req, res, next) => {
  // Skip connection check for health and test endpoints
  if (req.path === '/health' || req.path === '/api/test') {
    return next();
  }
  
  // If MongoDB connection failed, return error
  if (mongoConnectionError) {
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: mongoConnectionError.message
    });
  }
  
  // If MongoDB not yet connected, wait a bit more
  if (!mongoConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection initializing, please try again in a moment'
    });
  }
  
  next();
});

// Safely import and use routes
try {
  // Import routes
  import('../routes/authRoutes.js').then(module => {
    app.use('/api/auth', module.default);
  }).catch(err => {
    console.error('Failed to load auth routes:', err);
  });

  import('../routes/userRoutes.js').then(module => {
    app.use('/api/users', module.default);
  }).catch(err => {
    console.error('Failed to load user routes:', err);
  });

  import('../routes/adminRoutes.js').then(module => {
    app.use('/api/admin', module.default);
  }).catch(err => {
    console.error('Failed to load admin routes:', err);
  });

  import('../routes/activityRoutes.js').then(module => {
    app.use('/api/activities', module.default);
  }).catch(err => {
    console.error('Failed to load activity routes:', err);
  });

  import('../routes/uploadRoutes.js').then(module => {
    app.use('/api/upload', module.default);
  }).catch(err => {
    console.error('Failed to load upload routes:', err);
  });

  import('../routes/productUploadRoutes.js').then(module => {
    app.use('/api/upload', module.default);
  }).catch(err => {
    console.error('Failed to load product upload routes:', err);
  });

  import('../routes/productRoutes.js').then(module => {
    app.use('/api', module.default);
  }).catch(err => {
    console.error('Failed to load product routes:', err);
  });

  import('../routes/cartRoutes.js').then(module => {
    app.use('/api', module.default);
  }).catch(err => {
    console.error('Failed to load cart routes:', err);
  });

  import('../routes/walletRoutes.js').then(module => {
    app.use('/api/users', module.default);
  }).catch(err => {
    console.error('Failed to load wallet routes:', err);
  });

  import('../routes/deliveryWalletRoutes.js').then(module => {
    app.use('/api/delivery', module.default);
  }).catch(err => {
    console.error('Failed to load delivery wallet routes:', err);
  });

  import('../routes/licenseRoutes.js').then(module => {
    app.use('/api/license', module.default);
  }).catch(err => {
    console.error('Failed to load license routes:', err);
  });

  import('../routes/notificationRoutes.js').then(module => {
    app.use('/api/notifications', module.default);
  }).catch(err => {
    console.error('Failed to load notification routes:', err);
  });

  import('../routes/addressRoutes.js').then(module => {
    app.use('/api/addresses', module.default);
  }).catch(err => {
    console.error('Failed to load address routes:', err);
  });

  import('../routes/paymentRoutes.js').then(module => {
    app.use('/api/payment', module.default);
  }).catch(err => {
    console.error('Failed to load payment routes:', err);
  });

  import('../routes/orderRoutes.js').then(module => {
    app.use('/api/orders', module.default);
  }).catch(err => {
    console.error('Failed to load order routes:', err);
  });

  import('../routes/adminLicenseRoutes.js').then(module => {
    app.use('/api/admin/licenses', module.default);
  }).catch(err => {
    console.error('Failed to load admin license routes:', err);
  });

  import('../routes/sellerFarmerTransactionRoutes.js').then(module => {
    app.use('/api', module.default);
  }).catch(err => {
    console.error('Failed to load seller farmer transaction routes:', err);
  });

  import('../routes/farmerProductRoutes.js').then(module => {
    app.use('/api', module.default);
  }).catch(err => {
    console.error('Failed to load farmer product routes:', err);
  });

  import('../routes/deliveryVerificationRoutes.js').then(module => {
    app.use('/api/delivery-verification', module.default);
  }).catch(err => {
    console.error('Failed to load delivery verification routes:', err);
  });

} catch (err) {
  console.error('Error importing routes:', err);
}

// Basic Route
app.get('/', (req, res) => res.send('FreshCart API Running on Vercel'));

// Log all API requests
try {
  import('../middleware/activityLogger.js').then(module => {
    app.use('/api/*', module.logActivity('api-request', 'system', {
      captureResponse: true,
      captureRequest: true
    }));
  }).catch(err => {
    console.error('Failed to load activity logger:', err);
  });
} catch (err) {
  console.error('Error importing activity logger:', err);
}

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