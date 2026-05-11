#!/usr/bin/env node

/**
 * Release helper script
 * Usage: node scripts/release.mjs [patch|minor|major|prerelease|--dry-run]
 *
 * Steps:
 * 1. Bump version in package.json
 * 2. Create git tag
 * 3. Push tag to trigger GitHub Action
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const bumpType = args.find((a) => !a.startsWith('--')) || 'patch';

// Validate bump type
const validTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
if (!validTypes.includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Get current version and calculate new version
const currentVersion = pkg.version;
let newVersion;

if (bumpType === 'prerelease') {
  // Handle prerelease (append -pre.1, -pre.2, etc.)
  const match = currentVersion.match(/^(.*?)(?:-pre\.(\d+))?$/);
  const base = match[1];
  const preNum = match[2] ? parseInt(match[2]) + 1 : 1;
  newVersion = `${base}-pre.${preNum}`;
} else {
  // Use npm version to calculate
  newVersion = execSync(`npm version ${bumpType} --no-git-tag-version`, { encoding: 'utf-8' }).trim();
  newVersion = newVersion.replace(/^v/, '');
}

console.log(`Version: ${currentVersion} → ${newVersion}`);

if (isDryRun) {
  console.log('\n[DRY RUN] Would execute:');
  console.log(`  npm version ${newVersion}`);
  console.log(`  git tag v${newVersion}`);
  console.log(`  git push origin v${newVersion}`);
  process.exit(0);
}

// Update package.json
pkg.version = newVersion;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// Git commit and tag
try {
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
  execSync(`git push origin main v${newVersion}`, { stdio: 'inherit' });
  console.log(`\n✅ Released v${newVersion}`);
  console.log('   GitHub Actions will create the release.');
} catch (err) {
  console.error('Release failed:', err.message);
  process.exit(1);
}
