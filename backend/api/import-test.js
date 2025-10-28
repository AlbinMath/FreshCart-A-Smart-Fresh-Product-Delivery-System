// Test to see if we can import the Express app
let importSuccess = false;
let importError = null;

try {
  // Try to import the Express app
  await import('../server.js');
  importSuccess = true;
  console.log('[Import Test] Successfully imported server.js');
} catch (error) {
  importError = error;
  console.error('[Import Test] Failed to import server.js:', error);
}

export default function handler(request, response) {
  if (importSuccess) {
    response.status(200).json({
      success: true,
      message: 'Successfully imported Express app',
      timestamp: new Date().toISOString()
    });
  } else {
    response.status(500).json({
      success: false,
      message: 'Failed to import Express app',
      error: importError ? importError.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}