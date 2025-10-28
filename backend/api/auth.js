// Vercel function for auth routes
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

// Import auth routes
import authRoutes from '../routes/authRoutes.js';

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

// Auth Routes
app.use('/api/auth', authRoutes);

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

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);