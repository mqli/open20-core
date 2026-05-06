// scripts/bundle.mjs
// Browser bundle builder using esbuild
import * as esbuild from 'esbuild';

const entryPoint = 'src/browser-index.ts';

// UMD build (script tag)
await esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: 'dist/open20-core.js',
  format: 'iife',
  globalName: 'Open20Core',
  minify: true,
  sourcemap: true,
});

// ESM build (type="module" script)
await esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: 'dist/open20-core.esm.js',
  format: 'esm',
  minify: true,
  sourcemap: true,
});

console.log('✅ Browser bundles created:');
console.log('   dist/open20-core.js      (UMD - <script> tag)');
console.log('   dist/open20-core.esm.js  (ESM - <script type="module">)');
