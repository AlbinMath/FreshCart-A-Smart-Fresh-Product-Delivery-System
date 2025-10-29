// Vercel function for auth routes
import express from 'express';
import serverless from 'serverless-http';
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

// Safely import and use auth routes
try {
  import('../routes/authRoutes.js').then(module => {
    app.use('/api/auth', module.default);
  }).catch(err => {
    console.error('Failed to load auth routes:', err);
    app.get('/api/auth/*', (req, res) => {
      res.status(500).json({
        success: false,
        message: 'Auth routes failed to load',
        error: err.message
      });
    });
  });
} catch (err) {
  console.error('Error importing auth routes:', err);
  app.get('/api/auth/*', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Auth routes failed to load',
      error: err.message
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth API is running on Vercel',
    timestamp: new Date().toISOString()
  });
});

// Basic Route
app.get('/', (req, res) => res.send('FreshCart Auth API Running on Vercel'));

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