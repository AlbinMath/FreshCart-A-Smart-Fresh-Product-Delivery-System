// Set environment variables before importing vite
process.env.ROLLUP_DISABLE_NATIVE_ADDONS = '1';
process.env.ROLLUP_PREFER_BUILDIN = 'false';

console.log('Starting custom build process...');
console.log('Node.js version:', process.version);
console.log('ROLLUP_DISABLE_NATIVE_ADDONS:', process.env.ROLLUP_DISABLE_NATIVE_ADDONS);

// Custom build script to handle rollup native module issues
const { build } = require('vite');
const path = require('path');

async function buildProject() {
  try {
    await build({
      root: path.resolve(__dirname),
      mode: 'production',
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          external: []
        }
      }
    });
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildProject();