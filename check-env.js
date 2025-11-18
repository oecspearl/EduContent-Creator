#!/usr/bin/env node
/**
 * Check and update .env file for Supabase
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

const envPath = '.env';

// Read existing .env
let envContent = '';
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8');
  console.log('✓ Found existing .env file\n');
} else {
  console.log('✓ Creating new .env file\n');
}

// Parse existing variables
const existingVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+?)\s*=\s*(.+)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    existingVars[key] = value;
  }
});

console.log('Current environment variables:');
Object.keys(existingVars).forEach(key => {
  const value = existingVars[key];
  const displayValue = key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD') || key.includes('TOKEN')
    ? (value.length > 20 ? value.substring(0, 20) + '...' : '***')
    : value;
  console.log(`  ${key} = ${displayValue}`);
});

// Required variables
const required = {
  SESSION_SECRET: existingVars.SESSION_SECRET || randomBytes(32).toString('hex'),
  DATABASE_URL: existingVars.DATABASE_URL || '',
  NODE_ENV: existingVars.NODE_ENV || 'development',
  PORT: existingVars.PORT || '5000',
};

// Optional but useful
const optional = {
  OPENAI_API_KEY: existingVars.OPENAI_API_KEY || existingVars.REACT_APP_OPENAI_API_KEY || '',
  GOOGLE_CLIENT_ID: existingVars.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: existingVars.GOOGLE_CLIENT_SECRET || '',
  MICROSOFT_CLIENT_ID: existingVars.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_CLIENT_SECRET: existingVars.MICROSOFT_CLIENT_SECRET || '',
  MICROSOFT_TENANT_ID: existingVars.MICROSOFT_TENANT_ID || '',
  UNSPLASH_ACCESS_KEY: existingVars.UNSPLASH_ACCESS_KEY || '',
  YOUTUBE_API_KEY: existingVars.YOUTUBE_API_KEY || existingVars.GOOGLE_API_KEY || '',
};

// Build new .env content
let newEnvContent = `# ============================================
# OECS Learning Hub - Environment Variables
# Supabase Configuration
# ============================================

# ============================================
# REQUIRED VARIABLES
# ============================================

# Session Secret (REQUIRED)
SESSION_SECRET=${required.SESSION_SECRET}

# Database URL (REQUIRED for Supabase)
# Get from: Supabase Dashboard → Settings → Database → Connection String (URI format)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL=${required.DATABASE_URL || 'postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'}

# ============================================
# SERVER CONFIGURATION
# ============================================

NODE_ENV=${required.NODE_ENV}
PORT=${required.PORT}

# ============================================
# OPTIONAL: AI FEATURES
# ============================================

# OpenAI API Key (for AI content generation and chat)
# Note: Use OPENAI_API_KEY (not REACT_APP_OPENAI_API_KEY)
OPENAI_API_KEY=${optional.OPENAI_API_KEY || ''}

# ============================================
# OPTIONAL: OAUTH AUTHENTICATION
# ============================================

# Google OAuth
GOOGLE_CLIENT_ID=${optional.GOOGLE_CLIENT_ID || ''}
GOOGLE_CLIENT_SECRET=${optional.GOOGLE_CLIENT_SECRET || ''}

# Microsoft OAuth
MICROSOFT_CLIENT_ID=${optional.MICROSOFT_CLIENT_ID || ''}
MICROSOFT_CLIENT_SECRET=${optional.MICROSOFT_CLIENT_SECRET || ''}
MICROSOFT_TENANT_ID=${optional.MICROSOFT_TENANT_ID || 'common'}

# ============================================
# OPTIONAL: MEDIA SERVICES
# ============================================

# Unsplash API (for stock images)
UNSPLASH_ACCESS_KEY=${optional.UNSPLASH_ACCESS_KEY || ''}

# YouTube API (for video search)
# Can use YOUTUBE_API_KEY or GOOGLE_API_KEY
YOUTUBE_API_KEY=${optional.YOUTUBE_API_KEY || ''}
`;

// Write new .env file
writeFileSync(envPath, newEnvContent, 'utf-8');

console.log('\n' + '='.repeat(50));
console.log('✓ .env file updated!');
console.log('='.repeat(50));

// Check what's missing
const missing = [];
if (!required.DATABASE_URL || required.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  missing.push('DATABASE_URL (Supabase connection string)');
}

console.log('\nRequired variables status:');
console.log(`  ✓ SESSION_SECRET: ${required.SESSION_SECRET ? 'Set' : 'MISSING'}`);
console.log(`  ${required.DATABASE_URL && !required.DATABASE_URL.includes('[YOUR-PASSWORD]') ? '✓' : '⚠'} DATABASE_URL: ${required.DATABASE_URL && !required.DATABASE_URL.includes('[YOUR-PASSWORD]') ? 'Set' : 'NEEDS SUPABASE CONNECTION STRING'}`);
console.log(`  ✓ NODE_ENV: ${required.NODE_ENV}`);
console.log(`  ✓ PORT: ${required.PORT}`);

if (optional.OPENAI_API_KEY) {
  console.log(`  ✓ OPENAI_API_KEY: Set (converted from REACT_APP_OPENAI_API_KEY)`);
} else {
  console.log(`  ⚠ OPENAI_API_KEY: Not set (optional for AI features)`);
}

if (missing.length > 0) {
  console.log('\n⚠ Missing required variables:');
  missing.forEach(v => console.log(`  - ${v}`));
  console.log('\nTo get your Supabase DATABASE_URL:');
  console.log('  1. Go to https://supabase.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Go to Settings → Database');
  console.log('  4. Under "Connection string", select "URI"');
  console.log('  5. Copy and replace [YOUR-PASSWORD] with your database password');
} else {
  console.log('\n✓ All required variables are set!');
}

console.log('\nYour .env file has been updated with all necessary variables.');
console.log('Edit it to add your Supabase DATABASE_URL and any optional API keys.');

