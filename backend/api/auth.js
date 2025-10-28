// Vercel function for auth routes
import { createRequestHandler } from '@vercel/node-bridge';

let app;
let appError = null;

// Try to create a minimal Express app with just the auth routes
try {
  console.log('[Vercel Auth] Creating minimal Express app...');
  
  // Dynamically import express and auth routes
  const expressModule = await import('express');
  const authRoutesModule = await import('../routes/authRoutes.js');
  
  const express = expressModule.default;
  const authRoutes = authRoutesModule.default;
  
  // Create a minimal Express app with just the auth routes
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  console.log('[Vercel Auth] Successfully created minimal Express app');
} catch (error) {
  appError = error;
  console.error('[Vercel Auth] Failed to create minimal Express app:', error);
}

// Create the request handler
let handler;
if (app) {
  try {
    handler = createRequestHandler(app);
    console.log('[Vercel Auth] Successfully created request handler');
  } catch (error) {
    appError = error;
    console.error('[Vercel Auth] Failed to create request handler:', error);
  }
}

// Simple Vercel function for auth routes
export default async function handler(request, response) {
  // Return a simple response for now
  response.status(200).json({
    success: true,
    message: 'Auth API endpoint',
    note: 'Full implementation coming soon'
  });
}
