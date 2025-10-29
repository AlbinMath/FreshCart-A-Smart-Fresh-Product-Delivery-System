// Health check endpoint for Vercel
import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';

const app = express();

// Middleware to handle errors
app.use((err, req, res, next) => {
  console.error('Error in health endpoint:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error in health endpoint',
    error: err.message
  });
});

app.get('/api/health', (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.status(200).json({
      success: true,
      message: 'Health check endpoint working',
      mongoDB: {
        state: mongoStates[mongoState] || 'unknown',
        readyState: mongoState
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in health endpoint:', err);
    res.status(500).json({
      success: false,
      message: 'Error in health endpoint',
      error: err.message
    });
  }
});

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);