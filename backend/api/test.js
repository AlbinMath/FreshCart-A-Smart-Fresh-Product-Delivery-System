// Simple test function for Vercel
export default function handler(request, response) {
  response.status(200).json({
    success: true,
    message: 'Vercel backend is working!',
    timestamp: new Date().toISOString(),
    vercel: process.env.NOW_REGION || process.env.VERCEL ? true : false
  });
}