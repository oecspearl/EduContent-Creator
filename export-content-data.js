#!/usr/bin/env node
/**
 * Export content data field separately for specific content items
 * This is for exporting the large 'data' field when metadata-only export was used
 * 
 * Usage: npx tsx export-content-data.js [content-id-1] [content-id-2] ...
 * Or: npx tsx export-content-data.js all (exports all, but may fail for large datasets)
 */

import "dotenv/config";
import { db } from "./db/index.ts";
import { h5pContent } from "./shared/schema.ts";
import { eq, inArray } from "drizzle-orm";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const exportDir = "./database_export/content_data";
const contentIds = process.argv.slice(2);

async function exportContentData() {
  try {
    console.log("Exporting content data fields...\n");
    
    mkdirSync(exportDir, { recursive: true });
    
    let idsToExport = [];
    
    if (contentIds.length === 0) {
      console.log("No content IDs specified.");
      console.log("Usage: npx tsx export-content-data.js [id1] [id2] ...");
      console.log("Or: npx tsx export-content-data.js all (exports all - may be slow)");
      process.exit(1);
    }
    
    if (contentIds[0] === "all") {
      console.log("Fetching all content IDs...");
      const allIds = await db
        .select({ id: h5pContent.id })
        .from(h5pContent);
      idsToExport = allIds.map(row => row.id);
      console.log(`Found ${idsToExport.length} content items to export\n`);
    } else {
      idsToExport = contentIds;
    }
    
    let exported = 0;
    let failed = 0;
    
    // Export one at a time to avoid size issues
    for (const id of idsToExport) {
      try {
        const [content] = await db
          .select({
            id: h5pContent.id,
            data: h5pContent.data,
          })
          .from(h5pContent)
          .where(eq(h5pContent.id, id))
          .limit(1);
        
        if (content) {
          const filePath = join(exportDir, `${id}.json`);
          writeFileSync(filePath, JSON.stringify({ id: content.id, data: content.data }, null, 2));
          exported++;
          if (exported % 10 === 0) {
            console.log(`  Exported ${exported}/${idsToExport.length}...`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to export ${id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n✓ Export complete!`);
    console.log(`  Exported: ${exported}`);
    console.log(`  Failed: ${failed}`);
    console.log(`\nData files saved to: ${exportDir}`);
    
  } catch (error) {
    console.error("\n❌ Export failed:", error);
    process.exit(1);
  }
}

exportContentData();

