#!/usr/bin/env node
/**
 * Clean and organize .env file for Supabase
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const envPath = '.env';

// Read existing .env
let envContent = '';
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8');
}

// Parse all variables (keep last value if duplicates)
const vars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) return;
  
  const match = trimmed.match(/^([^#=]+?)\s*=\s*(.+)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    // Keep the last value if there are duplicates
    vars[key] = value;
  }
});

// Build clean .env file
const cleanEnv = `# ============================================
# OECS Learning Hub - Environment Variables
# Supabase Configuration
# ============================================

# ============================================
# REQUIRED VARIABLES
# ============================================

# Session Secret (REQUIRED)
SESSION_SECRET=${vars.SESSION_SECRET || 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING'}

# Database URL (REQUIRED for Supabase)
# Get from: Supabase Dashboard → Settings → Database → Connection String (URI format)
DATABASE_URL=${vars.DATABASE_URL || ''}

# ============================================
# SERVER CONFIGURATION
# ============================================

NODE_ENV=${vars.NODE_ENV || 'development'}
PORT=${vars.PORT || '5000'}

# ============================================
# OPTIONAL: AI FEATURES
# ============================================

# OpenAI API Key (for AI content generation and chat)
OPENAI_API_KEY=${vars.OPENAI_API_KEY || ''}

# ============================================
# OPTIONAL: OAUTH AUTHENTICATION
# ============================================

# Google OAuth (for Google sign-in, Google Slides, and Google Classroom)
GOOGLE_CLIENT_ID=${vars.GOOGLE_CLIENT_ID || ''}
GOOGLE_CLIENT_SECRET=${vars.GOOGLE_CLIENT_SECRET || ''}

# Microsoft OAuth (for Microsoft sign-in)
MICROSOFT_CLIENT_ID=${vars.MICROSOFT_CLIENT_ID || ''}
MICROSOFT_CLIENT_SECRET=${vars.MICROSOFT_CLIENT_SECRET || ''}
MICROSOFT_TENANT_ID=${vars.MICROSOFT_TENANT_ID || 'common'}

# ============================================
# OPTIONAL: MEDIA SERVICES
# ============================================

# Unsplash API (for stock images in Google Slides)
UNSPLASH_ACCESS_KEY=${vars.UNSPLASH_ACCESS_KEY || ''}

# YouTube API (for video search)
# Can use YOUTUBE_API_KEY or GOOGLE_API_KEY
YOUTUBE_API_KEY=${vars.YOUTUBE_API_KEY || vars.GOOGLE_API_KEY || ''}
GOOGLE_API_KEY=${vars.GOOGLE_API_KEY || vars.YOUTUBE_API_KEY || ''}

# ============================================
# SUPABASE SPECIFIC (for reference)
# ============================================
# These are set automatically by Supabase but kept for reference
${vars.SUPABASE_URL ? `SUPABASE_URL=${vars.SUPABASE_URL}` : '# SUPABASE_URL='}
${vars.SUPABASE_ANON_KEY ? `SUPABASE_ANON_KEY=${vars.SUPABASE_ANON_KEY}` : '# SUPABASE_ANON_KEY='}
${vars.SUPABASE_SERVICE_ROLE_KEY ? `SUPABASE_SERVICE_ROLE_KEY=${vars.SUPABASE_SERVICE_ROLE_KEY}` : '# SUPABASE_SERVICE_ROLE_KEY='}

# ============================================
# NOTES
# ============================================
# 
# To get your Supabase DATABASE_URL:
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Go to Settings → Database
# 4. Under "Connection string", select "URI"
# 5. Copy the connection string
# 
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
#
# ============================================
`;

writeFileSync(envPath, cleanEnv, 'utf-8');

console.log('✓ .env file cleaned and organized!\n');

// Check what's set
console.log('Required variables:');
console.log(`  ${vars.SESSION_SECRET ? '✓' : '✗'} SESSION_SECRET: ${vars.SESSION_SECRET ? 'Set' : 'MISSING'}`);
console.log(`  ${vars.DATABASE_URL ? '✓' : '✗'} DATABASE_URL: ${vars.DATABASE_URL ? 'Set (Supabase)' : 'MISSING'}`);
console.log(`  ✓ NODE_ENV: ${vars.NODE_ENV || 'development'}`);
console.log(`  ✓ PORT: ${vars.PORT || '5000'}`);

console.log('\nOptional variables:');
console.log(`  ${vars.OPENAI_API_KEY ? '✓' : '✗'} OPENAI_API_KEY: ${vars.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`  ${vars.GOOGLE_CLIENT_ID ? '✓' : '✗'} GOOGLE_CLIENT_ID: ${vars.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}`);
console.log(`  ${vars.GOOGLE_CLIENT_SECRET ? '✓' : '✗'} GOOGLE_CLIENT_SECRET: ${vars.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
console.log(`  ${vars.MICROSOFT_CLIENT_ID ? '✓' : '✗'} MICROSOFT_CLIENT_ID: ${vars.MICROSOFT_CLIENT_ID ? 'Set' : 'Not set'}`);
console.log(`  ${vars.MICROSOFT_CLIENT_SECRET ? '✓' : '✗'} MICROSOFT_CLIENT_SECRET: ${vars.MICROSOFT_CLIENT_SECRET ? 'Set' : 'Not set'}`);
console.log(`  ${vars.UNSPLASH_ACCESS_KEY ? '✓' : '✗'} UNSPLASH_ACCESS_KEY: ${vars.UNSPLASH_ACCESS_KEY ? 'Set' : 'Not set'}`);
console.log(`  ${vars.YOUTUBE_API_KEY || vars.GOOGLE_API_KEY ? '✓' : '✗'} YOUTUBE_API_KEY: ${vars.YOUTUBE_API_KEY || vars.GOOGLE_API_KEY ? 'Set' : 'Not set'}`);

if (!vars.DATABASE_URL) {
  console.log('\n⚠ WARNING: DATABASE_URL is missing!');
  console.log('Add your Supabase connection string to .env');
}

