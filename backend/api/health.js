// Health check endpoint for Vercel
import express from 'express';
import serverless from 'serverless-http';
import mongoose from 'mongoose';

const app = express();

app.get('/api/health', (req, res) => {
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
});

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);