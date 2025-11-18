#!/usr/bin/env node
/**
 * Export all data from the current database to JSON files
 * Run: npx tsx export-database.js
 */

import "dotenv/config";
import { db } from "./db/index.ts";
import { profiles, h5pContent, contentShares, learnerProgress, quizAttempts, interactionEvents, chatMessages } from "./shared/schema.ts";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const exportDir = "./database_export";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

async function exportDatabase() {
  try {
    console.log("Starting database export...\n");
    
    // Create export directory
    const exportPath = join(exportDir, timestamp);
    mkdirSync(exportPath, { recursive: true });
    console.log(`✓ Created export directory: ${exportPath}\n`);
    
    // Export profiles
    console.log("Exporting profiles...");
    const profilesData = await db.select().from(profiles);
    writeFileSync(
      join(exportPath, "profiles.json"),
      JSON.stringify(profilesData, null, 2)
    );
    console.log(`  ✓ Exported ${profilesData.length} profiles`);
    
    // Export content (metadata only to avoid size issues)
    // Since individual items are extremely large, we'll export metadata first
    // The data field can be exported separately if needed
    console.log("\nExporting content metadata (excluding large data field)...");
    console.log("  Note: Large 'data' fields will be excluded. Export individually if needed.\n");
    
    const allContent = [];
    let offset = 0;
    const chunkSize = 10; // Small chunks for metadata
    let hasMore = true;
    let attemptCount = 0;
    const maxAttempts = 10000; // Safety limit
    
    while (hasMore && attemptCount < maxAttempts) {
      attemptCount++;
      try {
        // Export metadata only (without the large data field)
        const metadataChunk = await db
          .select({
            id: h5pContent.id,
            title: h5pContent.title,
            description: h5pContent.description,
            type: h5pContent.type,
            userId: h5pContent.userId,
            isPublished: h5pContent.isPublished,
            isPublic: h5pContent.isPublic,
            tags: h5pContent.tags,
            createdAt: h5pContent.createdAt,
            updatedAt: h5pContent.updatedAt,
          })
          .from(h5pContent)
          .limit(chunkSize)
          .offset(offset)
          .orderBy(h5pContent.createdAt);
        
        if (metadataChunk.length === 0) {
          hasMore = false;
        } else {
          // Add empty data field placeholder
          const chunkWithPlaceholder = metadataChunk.map(item => ({
            ...item,
            data: null, // Data excluded - too large for batch export
            _exportNote: "Data field excluded due to size. Use export-content-data.js to export data separately."
          }));
          allContent.push(...chunkWithPlaceholder);
          offset += chunkSize;
          console.log(`  Exported ${allContent.length} content items (metadata only)...`);
          
          if (metadataChunk.length < chunkSize) {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`  ❌ Error at offset ${offset}:`, error.message);
        // If even metadata fails, try one item at a time
        if (error.message && error.message.includes("response is too large")) {
          console.log(`  ⚠ Trying individual item export...`);
          // Try exporting one item at a time
          const singleItem = await db
            .select({
              id: h5pContent.id,
              title: h5pContent.title,
              description: h5pContent.description,
              type: h5pContent.type,
              userId: h5pContent.userId,
              isPublished: h5pContent.isPublished,
              isPublic: h5pContent.isPublic,
              tags: h5pContent.tags,
              createdAt: h5pContent.createdAt,
              updatedAt: h5pContent.updatedAt,
            })
            .from(h5pContent)
            .limit(1)
            .offset(offset)
            .orderBy(h5pContent.createdAt);
          
          if (singleItem.length > 0) {
            allContent.push({
              ...singleItem[0],
              data: null,
              _exportNote: "Data field excluded - item too large"
            });
            offset += 1;
            console.log(`  Exported ${allContent.length} content items (one at a time)...`);
          } else {
            hasMore = false;
          }
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
    }
    
    // Write content in chunks to avoid file size issues
    const contentChunks = [];
    const itemsPerFile = 1000;
    for (let i = 0; i < allContent.length; i += itemsPerFile) {
      const chunk = allContent.slice(i, i + itemsPerFile);
      const chunkFile = join(exportPath, `h5p_content_chunk_${Math.floor(i / itemsPerFile) + 1}.json`);
      writeFileSync(chunkFile, JSON.stringify(chunk, null, 2));
      contentChunks.push(chunkFile);
      console.log(`  ✓ Wrote chunk ${Math.floor(i / itemsPerFile) + 1} (${chunk.length} items)`);
    }
    
    console.log(`  ✓ Exported ${allContent.length} content items total`);
    
    // Export other tables
    console.log("\nExporting content shares...");
    const sharesData = await db.select().from(contentShares);
    writeFileSync(
      join(exportPath, "content_shares.json"),
      JSON.stringify(sharesData, null, 2)
    );
    console.log(`  ✓ Exported ${sharesData.length} shares`);
    
    console.log("\nExporting learner progress...");
    const progressData = await db.select().from(learnerProgress);
    writeFileSync(
      join(exportPath, "learner_progress.json"),
      JSON.stringify(progressData, null, 2)
    );
    console.log(`  ✓ Exported ${progressData.length} progress records`);
    
    console.log("\nExporting quiz attempts...");
    const quizAttemptsData = await db.select().from(quizAttempts);
    writeFileSync(
      join(exportPath, "quiz_attempts.json"),
      JSON.stringify(quizAttemptsData, null, 2)
    );
    console.log(`  ✓ Exported ${quizAttemptsData.length} quiz attempts`);
    
    console.log("\nExporting interaction events...");
    const eventsData = await db.select().from(interactionEvents);
    writeFileSync(
      join(exportPath, "interaction_events.json"),
      JSON.stringify(eventsData, null, 2)
    );
    console.log(`  ✓ Exported ${eventsData.length} interaction events`);
    
    console.log("\nExporting chat messages...");
    const chatData = await db.select().from(chatMessages);
    writeFileSync(
      join(exportPath, "chat_messages.json"),
      JSON.stringify(chatData, null, 2)
    );
    console.log(`  ✓ Exported ${chatData.length} chat messages`);
    
    // Create manifest file
    const manifest = {
      exportDate: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@") : "not set",
      tables: {
        profiles: profilesData.length,
        h5pContent: allContent.length,
        contentShares: sharesData.length,
        learnerProgress: progressData.length,
        quizAttempts: quizAttemptsData.length,
        interactionEvents: eventsData.length,
        chatMessages: chatData.length,
      },
      contentChunks: contentChunks.length,
    };
    
    writeFileSync(
      join(exportPath, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log("\n" + "=".repeat(50));
    console.log("✓ Export complete!");
    console.log("=".repeat(50));
    console.log(`\nExport location: ${exportPath}`);
    console.log(`\nTotal records exported:`);
    console.log(`  - Profiles: ${profilesData.length}`);
    console.log(`  - Content: ${allContent.length}`);
    console.log(`  - Shares: ${sharesData.length}`);
    console.log(`  - Progress: ${progressData.length}`);
    console.log(`  - Quiz Attempts: ${quizAttemptsData.length}`);
    console.log(`  - Events: ${eventsData.length}`);
    console.log(`  - Chat Messages: ${chatData.length}`);
    console.log(`\nNext step: Use import-database.js to import into a new database`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Export failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

exportDatabase();

