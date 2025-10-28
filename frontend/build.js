// Custom build script to handle rollup native module issues
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProject() {
  try {
    console.log('Starting custom build process...');
    
    // Log Node.js version
    console.log('Node.js version:', process.version);
    
    // Set environment variable to disable native addons
    process.env.ROLLUP_DISABLE_NATIVE_ADDONS = '1';
    
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