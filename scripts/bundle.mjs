// scripts/bundle.mjs
// Browser bundle builder using esbuild
import * as esbuild from 'esbuild';

const entryPoint = 'src/index.ts';

const sharedConfig = {
  entryPoints: [entryPoint],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'neutral',
  format: 'esm',
  // Node.js built-ins should be external (not bundled)
  external: ['fs', 'fs/promises', 'path', 'node:fs', 'node:path', 'node:module'],
};

// UMD build (script tag)
await esbuild.build({
  ...sharedConfig,
  outfile: 'dist/open20-core.js',
  format: 'iife',
  globalName: 'Open20Core',
});

// ESM build (type="module" script)
await esbuild.build({
  ...sharedConfig,
  outfile: 'dist/open20-core.esm.js',
  format: 'esm',
});

console.log('Browser bundles built successfully!');
