// Simple test to see if Vercel function works
export default function handler(request, response) {
  response.status(200).json({
    success: true,
    message: 'Simple test working!',
    timestamp: new Date().toISOString()
  });
}