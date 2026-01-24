import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build the bundled API
await esbuild.build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'api/index.js',
  packages: 'external',
  alias: {
    '@shared': path.resolve(__dirname, 'shared'),
    '@': path.resolve(__dirname, 'client/src'),
  },
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
    `.trim(),
  },
});

// Remove the TypeScript source to avoid conflicts
try {
  fs.unlinkSync('api/index.ts');
  console.log('Removed api/index.ts');
} catch (e) {
  // File might not exist
}

console.log('API build complete -> api/index.js');
