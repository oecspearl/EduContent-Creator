import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build the bundled API to a separate file
await esbuild.build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'api/bundled.js',
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

console.log('API build complete -> api/bundled.js');
