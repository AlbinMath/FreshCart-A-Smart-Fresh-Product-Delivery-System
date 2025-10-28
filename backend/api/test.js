// Simple test endpoint for Vercel
import express from 'express';
import serverless from 'serverless-http';

const app = express();

app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Root test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);