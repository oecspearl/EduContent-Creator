#!/usr/bin/env node
/**
 * Check and fix issues with a specific user
 * Run: node fix-user-issue.js royston.emmanuel@oecs.int
 */

import "dotenv/config";
import { db } from "./db/index.ts";
import { profiles, h5pContent } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

const email = process.argv[2] || "royston.emmanuel@oecs.int";

async function checkUser() {
  try {
    console.log(`Checking user: ${email}\n`);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log("\nAvailable users:");
      const allUsers = await db.select().from(profiles);
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id})`);
      });
      process.exit(1);
    }
    
    console.log("✓ User found:");
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.fullName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.createdAt}`);
    console.log(`  Updated: ${user.updatedAt}`);
    
    // Check user's content
    console.log("\nChecking user's content...");
    const userContent = await db
      .select()
      .from(h5pContent)
      .where(eq(h5pContent.userId, user.id));
    
    console.log(`  Found ${userContent.length} content items`);
    
    if (userContent.length > 0) {
      console.log("\nContent items:");
      userContent.forEach((content, i) => {
        console.log(`  ${i + 1}. ${content.title} (${content.type}) - ID: ${content.id}`);
      });
    }
    
    // Check for any data issues
    console.log("\nChecking for issues...");
    
    // Check if user ID is valid format
    if (!user.id || user.id.length < 10) {
      console.log("⚠ Warning: User ID seems unusual:", user.id);
    }
    
    // Check if there are any content items with mismatched user IDs
    const allContent = await db.select().from(h5pContent);
    const mismatched = allContent.filter(c => c.userId === user.id && !userContent.find(uc => uc.id === c.id));
    if (mismatched.length > 0) {
      console.log(`⚠ Warning: Found ${mismatched.length} content items with potential ID mismatch`);
    }
    
    console.log("\n✓ User check complete!");
    console.log("\nIf there are issues, try:");
    console.log("  1. Check the user ID format in the database");
    console.log("  2. Verify the userId field in h5p_content table");
    console.log("  3. Check for any special characters in the user ID");
    
  } catch (error) {
    console.error("❌ Error checking user:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

checkUser();

