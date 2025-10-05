// Global teardown for Playwright tests

async function globalTeardown() {
  console.log('🧹 Starting global teardown...');
  
  // You can add global teardown logic here
  // For example: database cleanup, server shutdown, etc.
  
  console.log('✅ Global teardown completed');
}

module.exports = globalTeardown;