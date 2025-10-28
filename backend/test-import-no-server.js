// Test script to check if server.js can be imported without starting the server
console.log('Testing server.js import without starting server...');

// Set environment variable to simulate Vercel environment
process.env.VERCEL = '1';

try {
  console.log('Attempting to import server.js...');
  const server = await import('./server.js');
  console.log('Successfully imported server.js');
  console.log('Server app type:', typeof server.default);
  console.log('Server app keys:', Object.keys(server.default || {}).length);
} catch (error) {
  console.error('Failed to import server.js:', error);
  console.error('Error stack:', error.stack);
}

console.log('Test completed.');