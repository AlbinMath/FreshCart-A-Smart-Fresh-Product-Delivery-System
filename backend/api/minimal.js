// Vercel function using minimal Express app
import { createRequestHandler } from '@vercel/node-bridge';

let app;
let appError = null;

// Try to import the minimal Express app
try {
  console.log('[Vercel Minimal] Attempting to import minimal Express app...');
  const appModule = await import('./minimal-server.js');
  app = appModule.default;
  console.log('[Vercel Minimal] Successfully imported minimal Express app');
} catch (error) {
  appError = error;
  console.error('[Vercel Minimal] Failed to import minimal Express app:', error);
}

// Create the request handler
let handler;
if (app) {
  try {
    handler = createRequestHandler(app);
    console.log('[Vercel Minimal] Successfully created request handler');
  } catch (error) {
    appError = error;
    console.error('[Vercel Minimal] Failed to create request handler:', error);
  }
}

// Export the Vercel function handler
export default async function vercelMinimalHandler(request, response) {
  try {
    // If there was an error importing the app, return an error response
    if (appError) {
      console.error('[Vercel Minimal] Returning error response due to app import error:', appError);
      return response.status(500).json({
        success: false,
        message: 'Failed to initialize minimal Express app',
        error: process.env.NODE_ENV === 'development' ? appError.message : 'Internal Server Error'
      });
    }

    // If we don't have a handler, return an error response
    if (!handler) {
      console.error('[Vercel Minimal] No handler available');
      return response.status(500).json({
        success: false,
        message: 'Minimal request handler not available',
        error: 'Internal Server Error'
      });
    }

    // Use the handler to process the request
    console.log(`[Vercel Minimal] Handling request: ${request.method} ${request.url}`);
    return await handler(request, response);
  } catch (error) {
    console.error('[Vercel Minimal] Error in handler:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}