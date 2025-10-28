// Simple Vercel function that doesn't rely on @vercel/node-bridge
export default async function handler(request, response) {
  // Handle different HTTP methods and paths
  if (request.method === 'GET' && request.url === '/') {
    response.status(200).send('FreshCart API Running on Vercel');
    return;
  }
  
  if (request.method === 'GET' && request.url === '/health') {
    response.status(200).json({
      success: true,
      message: 'FreshCart API is running on Vercel',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // For API routes, we'll need to implement them individually
  // or use a different approach for the full Express app
  response.status(200).json({
    success: true,
    message: 'FreshCart API deployed on Vercel',
    note: 'API endpoints available at /api/*'
  });
}