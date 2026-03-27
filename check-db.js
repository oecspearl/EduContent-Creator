#!/usr/bin/env node
/**
 * Check if database tables exist
 * Run: node check-db.js
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env file");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    console.log("Checking database tables...\n");
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const requiredTables = [
      'profiles',
      'h5p_content',
      'content_shares',
      'learner_progress',
      'quiz_attempts',
      'interaction_events',
      'chat_messages'
    ];
    
    console.log("Found tables:");
    const foundTables = tables.map(t => t.table_name);
    foundTables.forEach(table => {
      console.log(`  ✓ ${table}`);
    });
    
    console.log("\nRequired tables:");
    const missing = requiredTables.filter(t => !foundTables.includes(t));
    
    requiredTables.forEach(table => {
      if (foundTables.includes(table)) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING`);
      }
    });
    
    if (missing.length > 0) {
      console.log(`\n❌ Missing ${missing.length} table(s). Run migrations:`);
      console.log("   npm run db:push");
      process.exit(1);
    } else {
      console.log("\n✓ All required tables exist!");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error checking database:", error.message);
    console.error("\nMake sure:");
    console.error("  1. DATABASE_URL is correct in .env");
    console.error("  2. Database is accessible");
    console.error("  3. You have permission to query information_schema");
    process.exit(1);
  }
}

checkTables();



