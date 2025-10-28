// Standalone Vercel function for testing
export default function handler(request, response) {
  // Log some debug information
  console.log('[Vercel Standalone] Function called');
  console.log('[Vercel Standalone] Request method:', request.method);
  console.log('[Vercel Standalone] Request URL:', request.url);
  console.log('[Vercel Standalone] Request headers:', Object.keys(request.headers || {}));
  
  // Return a simple response
  response.status(200).json({
    success: true,
    message: 'Standalone Vercel function is working!',
    method: request.method,
    url: request.url,
    headers: Object.keys(request.headers || {}).length,
    timestamp: new Date().toISOString(),
    vercel: process.env.VERCEL ? true : false,
    nowRegion: process.env.NOW_REGION || null
  });
}