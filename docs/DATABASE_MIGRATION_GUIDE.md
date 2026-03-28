# Database Migration Guide

This guide helps you export all data from your current database and import it into a new one.

## Why Migrate?

If you're experiencing "response too large" errors, migrating to a new database can help by:
- Starting fresh with a clean database
- Allowing you to archive or clean up old data
- Moving to a database with different size limits
- Organizing your data better

## Step 1: Export Current Database

1. **Make sure your current DATABASE_URL is set** in `.env`
2. **Run the export script**:
   ```bash
   npx tsx export-database.js
   ```

3. **Wait for export to complete** - this may take a while if you have a lot of data
4. **Check the export location** - data will be in `./database_export/[timestamp]/`

## Step 2: Set Up New Database

1. **Create a new PostgreSQL database**:
   - Option A: Create a new Neon project at https://neon.tech
   - Option B: Create a new Supabase project at https://supabase.com
   - Option C: Use a local PostgreSQL instance

2. **Get the connection string** for your new database

3. **Update your `.env` file**:
   ```env
   DATABASE_URL=postgresql://user:password@new-host:port/new-database?sslmode=require
   ```

4. **Run database migrations** on the new database:
   ```bash
   npm run db:push
   ```

## Step 3: Import Data to New Database

1. **Make sure DATABASE_URL points to your NEW database** in `.env`
2. **Run the import script**:
   ```bash
   npx tsx import-database.js
   ```
   
   Or specify the export directory:
   ```bash
   npx tsx import-database.js ./database_export/2025-11-17T20-30-00-000Z
   ```

3. **Wait for import to complete**

## Step 4: Verify and Test

1. **Check the import logs** - make sure all tables imported successfully
2. **Restart your server**: `npm run dev`
3. **Test the application** - log in and verify your data is accessible

## What Gets Exported/Imported

- ✅ **Profiles** - All user accounts
- ✅ **Content** - All educational content (exported in chunks to handle large datasets)
- ✅ **Content Shares** - Sharing metadata
- ✅ **Learner Progress** - Progress tracking data
- ✅ **Quiz Attempts** - Quiz scores and answers
- ✅ **Interaction Events** - User interaction data
- ✅ **Chat Messages** - AI assistant conversation history

## Troubleshooting

### Export Fails

- Check that `DATABASE_URL` is set correctly
- Make sure you have enough disk space
- Try exporting in smaller batches (modify chunk size in script)

### Import Fails

- Verify `DATABASE_URL` points to the NEW database
- Make sure you've run `npm run db:push` to create tables
- Check that the export files exist in the specified directory
- Review error messages for specific table issues

### Data Missing After Import

- Check the import logs for any errors
- Verify the export files contain the data
- Make sure you're looking at the correct database

## Alternative: Using pg_dump (PostgreSQL Native)

If you have `pg_dump` installed, you can use it directly:

```bash
# Export
pg_dump "your-connection-string" > database_backup.sql

# Import to new database
psql "new-connection-string" < database_backup.sql
```

## Notes

- The export creates JSON files, which are human-readable
- Content is exported in chunks to handle large datasets
- The import uses `onConflictDoNothing()` to avoid duplicate errors
- You can modify the scripts to filter or transform data during migration

---

**After migration, update your `.env` file and restart the server!**

