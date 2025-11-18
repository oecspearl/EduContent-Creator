#!/usr/bin/env node
/**
 * Initialize .env file with required variables
 * Run: node init-env.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

const envPath = '.env';

// Generate a secure random SESSION_SECRET
const generateSessionSecret = () => randomBytes(32).toString('hex');

// Read existing .env or create new
let envContent = '';
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8');
  console.log('✓ Found existing .env file');
} else {
  console.log('✓ Creating new .env file');
}

// Check if SESSION_SECRET exists
const hasSessionSecret = /^SESSION_SECRET\s*=/m.test(envContent);

if (!hasSessionSecret) {
  const sessionSecret = generateSessionSecret();
  console.log('✓ Generating SESSION_SECRET...');
  
  // Add SESSION_SECRET at the beginning
  envContent = `SESSION_SECRET=${sessionSecret}\n` + envContent;
  
  // Ensure NODE_ENV and PORT are set
  if (!/^NODE_ENV\s*=/m.test(envContent)) {
    envContent = `NODE_ENV=development\n` + envContent;
  }
  if (!/^PORT\s*=/m.test(envContent)) {
    envContent = `PORT=5000\n` + envContent;
  }
  
  writeFileSync(envPath, envContent, 'utf-8');
  console.log('✓ SESSION_SECRET added to .env file');
  console.log(`\nYour SESSION_SECRET: ${sessionSecret}`);
} else {
  console.log('✓ SESSION_SECRET already exists in .env file');
}

// Verify required variables
const requiredVars = ['SESSION_SECRET'];
const missing = requiredVars.filter(varName => {
  const regex = new RegExp(`^${varName}\\s*=`, 'm');
  return !regex.test(envContent);
});

if (missing.length > 0) {
  console.log(`\n⚠ Warning: Missing required variables: ${missing.join(', ')}`);
} else {
  console.log('\n✓ All required environment variables are set!');
}

// Check for DATABASE_URL
const hasDatabaseUrl = /^DATABASE_URL\s*=/m.test(envContent);
if (!hasDatabaseUrl) {
  console.log('\n⚠ DATABASE_URL is not set.');
  console.log('⚠ The app requires a PostgreSQL database to function.');
  console.log('⚠ Quick setup options:');
  console.log('   1. Neon (free): https://neon.tech');
  console.log('   2. Supabase (free): https://supabase.com');
  console.log('   3. Local PostgreSQL');
  console.log('\n   See DATABASE_SETUP.md for detailed instructions.');
  console.log('\n   After setting up, add to .env:');
  console.log('   DATABASE_URL=postgresql://user:pass@host:port/dbname');
  console.log('   Then run: npm run db:push');
} else {
  console.log('✓ DATABASE_URL is set');
}

console.log('\nYou can now run: npm run dev');

