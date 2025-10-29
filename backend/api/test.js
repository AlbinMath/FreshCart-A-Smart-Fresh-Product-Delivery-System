// Simple test endpoint for Vercel
import express from 'express';
import serverless from 'serverless-http';

const app = express();

// Middleware to handle errors
app.use((err, req, res, next) => {
  console.error('Error in test endpoint:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error in test endpoint',
    error: err.message
  });
});

app.get('/api/test', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in test endpoint:', err);
    res.status(500).json({
      success: false,
      message: 'Error in test endpoint',
      error: err.message
    });
  }
});

app.get('/test', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Root test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in root test endpoint:', err);
    res.status(500).json({
      success: false,
      message: 'Error in root test endpoint',
      error: err.message
    });
  }
});

// Export the app for Vercel serverless functions
export default app;
export const handler = serverless(app);