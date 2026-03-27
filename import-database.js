#!/usr/bin/env node
/**
 * Import data from JSON files into a new database
 * 
 * Usage:
 * 1. Set DATABASE_URL in .env to point to your NEW database
 * 2. Run: npx tsx import-database.js [export-directory]
 * 
 * Example:
 *   npx tsx import-database.js ./database_export/2025-11-17T20-30-00-000Z
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages } from "./shared/schema.ts";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const exportDir = process.argv[2] || "./database_export";

async function importDatabase() {
  let pool = null;
  let db = null;
  
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set in .env file (point to your NEW database)");
    }
    
    console.log("Starting database import...\n");
    console.log("⚠ WARNING: This will import data into the database specified in DATABASE_URL");
    console.log("⚠ Make sure you've set DATABASE_URL to your NEW database!\n");
    
    // Create PostgreSQL connection pool (works with Supabase)
    console.log("Connecting to database...");
    const isSupabase = process.env.DATABASE_URL?.includes("supabase");
    const isNeon = process.env.DATABASE_URL?.includes("neon");
    
    // Parse connection string to handle SSL properly
    // Remove sslmode from connection string - we'll handle SSL in Pool config
    let connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '');
    
    pool = new Pool({
      connectionString: connectionString,
      ssl: (isSupabase || isNeon) ? { 
        rejectUnauthorized: false 
      } : false,
      max: 10,
    });
    
    // Test connection
    await pool.query("SELECT NOW()");
    console.log("✓ Database connection successful\n");
    
    // Create Drizzle instance with node-postgres (compatible with Supabase)
    const schema = { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages };
    db = drizzle(pool, { schema });
    
    // Find the most recent export if no directory specified
    let exportPath = exportDir;
    if (!existsSync(exportPath)) {
      // Try to find latest export
      if (existsSync("./database_export")) {
        const exports = readdirSync("./database_export")
          .filter(f => !f.includes("."))
          .sort()
          .reverse();
        if (exports.length > 0) {
          exportPath = join("./database_export", exports[0]);
          console.log(`Using latest export: ${exportPath}\n`);
        }
      }
    }
    
    if (!existsSync(exportPath)) {
      throw new Error(`Export directory not found: ${exportPath}`);
    }
    
    // Read manifest
    const manifestPath = join(exportPath, "manifest.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      console.log("Export information:");
      console.log(`  Date: ${manifest.exportDate}`);
      console.log(`  Tables:`, manifest.tables);
      console.log("");
    }
    
    // Helper function to convert timestamp strings to Date objects
    function convertTimestamps(obj) {
      const converted = { ...obj };
      // Convert common timestamp fields
      if (converted.createdAt && typeof converted.createdAt === 'string') {
        converted.createdAt = new Date(converted.createdAt);
      }
      if (converted.updatedAt && typeof converted.updatedAt === 'string') {
        converted.updatedAt = new Date(converted.updatedAt);
      }
      if (converted.completedAt && typeof converted.completedAt === 'string') {
        converted.completedAt = new Date(converted.completedAt);
      }
      if (converted.lastAccessedAt && typeof converted.lastAccessedAt === 'string') {
        converted.lastAccessedAt = new Date(converted.lastAccessedAt);
      }
      if (converted.googleTokenExpiry && typeof converted.googleTokenExpiry === 'string') {
        converted.googleTokenExpiry = new Date(converted.googleTokenExpiry);
      }
      return converted;
    }
    
    // Import profiles
    console.log("Importing profiles...");
    const profilesData = JSON.parse(readFileSync(join(exportPath, "profiles.json"), "utf-8"));
    if (profilesData.length > 0) {
      // Delete existing profiles first (optional - comment out if you want to merge)
      // await db.delete(profiles);
      
      // Convert timestamp strings to Date objects
      const convertedProfiles = profilesData.map(convertTimestamps);
      
      await db.insert(profiles).values(convertedProfiles).onConflictDoNothing();
      console.log(`  ✓ Imported ${profilesData.length} profiles`);
    }
    
    // Import content (from chunks)
    console.log("\nImporting content...");
    const contentFiles = readdirSync(exportPath)
      .filter(f => f.startsWith("h5p_content_chunk_") && f.endsWith(".json"))
      .sort();
    
    let totalContent = 0;
    for (const file of contentFiles) {
      const contentData = JSON.parse(readFileSync(join(exportPath, file), "utf-8"));
      if (contentData.length > 0) {
        // Import in smaller batches to avoid size issues
        const batchSize = 50;
        for (let i = 0; i < contentData.length; i += batchSize) {
          const batch = contentData.slice(i, i + batchSize).map(convertTimestamps);
          await db.insert(h5pContent).values(batch).onConflictDoNothing();
        }
        totalContent += contentData.length;
        console.log(`  ✓ Imported ${contentData.length} items from ${file} (${totalContent} total)`);
      }
    }
    
    // Import other tables
    console.log("\nImporting content shares...");
    if (existsSync(join(exportPath, "content_shares.json"))) {
      const sharesData = JSON.parse(readFileSync(join(exportPath, "content_shares.json"), "utf-8"));
      if (sharesData.length > 0) {
        const convertedShares = sharesData.map(convertTimestamps);
        await db.insert(contentShares).values(convertedShares).onConflictDoNothing();
        console.log(`  ✓ Imported ${sharesData.length} shares`);
      }
    }
    
    console.log("\nImporting learner progress...");
    if (existsSync(join(exportPath, "learner_progress.json"))) {
      const progressData = JSON.parse(readFileSync(join(exportPath, "learner_progress.json"), "utf-8"));
      if (progressData.length > 0) {
        // Import in batches
        const batchSize = 100;
        for (let i = 0; i < progressData.length; i += batchSize) {
          const batch = progressData.slice(i, i + batchSize).map(convertTimestamps);
          await db.insert(learnerProgress).values(batch).onConflictDoNothing();
        }
        console.log(`  ✓ Imported ${progressData.length} progress records`);
      }
    }
    
    console.log("\nImporting quiz attempts...");
    if (existsSync(join(exportPath, "quiz_attempts.json"))) {
      const quizAttemptsData = JSON.parse(readFileSync(join(exportPath, "quiz_attempts.json"), "utf-8"));
      if (quizAttemptsData.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < quizAttemptsData.length; i += batchSize) {
          const batch = quizAttemptsData.slice(i, i + batchSize).map(convertTimestamps);
          await db.insert(quizAttempts).values(batch).onConflictDoNothing();
        }
        console.log(`  ✓ Imported ${quizAttemptsData.length} quiz attempts`);
      }
    }
    
    console.log("\nImporting interaction events...");
    if (existsSync(join(exportPath, "interaction_events.json"))) {
      const eventsData = JSON.parse(readFileSync(join(exportPath, "interaction_events.json"), "utf-8"));
      if (eventsData.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < eventsData.length; i += batchSize) {
          const batch = eventsData.slice(i, i + batchSize).map(convertTimestamps);
          await db.insert(interactionEvents).values(batch).onConflictDoNothing();
        }
        console.log(`  ✓ Imported ${eventsData.length} interaction events`);
      }
    }
    
    console.log("\nImporting chat messages...");
    if (existsSync(join(exportPath, "chat_messages.json"))) {
      const chatData = JSON.parse(readFileSync(join(exportPath, "chat_messages.json"), "utf-8"));
      if (chatData.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < chatData.length; i += batchSize) {
          const batch = chatData.slice(i, i + batchSize).map(convertTimestamps);
          await db.insert(chatMessages).values(batch).onConflictDoNothing();
        }
        console.log(`  ✓ Imported ${chatData.length} chat messages`);
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("✓ Import complete!");
    console.log("=".repeat(50));
    console.log(`\nAll data has been imported into: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`);
    console.log("\nNext steps:");
    console.log("1. Verify the data is accessible");
    console.log("2. Restart your server: npm run dev");
    console.log("3. Log in and check your content");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

importDatabase();

