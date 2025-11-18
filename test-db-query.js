#!/usr/bin/env node
/**
 * Test database query
 */

import "dotenv/config";
import { db } from "./db/index.js";
import { h5pContent } from "./shared/schema.js";

async function testQuery() {
  try {
    console.log("Testing database query...\n");
    
    // Try a simple query
    const result = await db.select().from(h5pContent).limit(1);
    console.log("✓ Query successful!");
    console.log(`Found ${result.length} content items`);
    
    if (result.length > 0) {
      console.log("Sample content:", result[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Query failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testQuery();



