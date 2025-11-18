# Database Import Instructions

## Step 1: Create Database Schema in Supabase

You have two options:

### Option A: Using SQL File (Recommended for Supabase)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file `new_database_schema.sql` in this project
5. Copy the **entire contents** of the file
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for "Success" message

### Option B: Using Drizzle (Alternative)

Run this command (SSL issues may occur with Supabase):
```bash
npm run db:push
```

---

## Step 2: Import Your Data

Once the schema is created, run the import script:

```bash
npx tsx import-database.js
```

Or specify a specific export directory:
```bash
npx tsx import-database.js ./database_export/2025-11-17T23-20-24-393Z
```

The script will:
- ✅ Import all profiles (users)
- ✅ Import all content (from chunk files if available)
- ✅ Import content shares
- ✅ Import learner progress
- ✅ Import quiz attempts
- ✅ Import interaction events
- ✅ Import chat messages

---

## Step 3: Verify Import

After import completes:
1. Check the console output for success messages
2. Restart your server: `npm run dev`
3. Log in and verify your data is accessible

---

## Notes

- The import uses `onConflictDoNothing()` so it's safe to run multiple times
- If content export failed (due to size), only profiles will be imported
- You may need to re-export content in smaller chunks if needed

